import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, ne, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { emailCampaign, emailLog, license, product, shopOrder, shopOrderItem, user } from "@/db/schema";
import { sendEmail, SITE_URL } from "./email";
import { getAdminSubscribers } from "./subscriptions";

// Emails envoyés depuis l'admin.
//  - Personnels : à un compte, tout de suite (pas de lien de désinscription : c'est une correspondance).
//  - Campagnes : à un public. Seulement aux comptes qui ont accepté les emails (inscription ou profil),
//    ou aux clients qui ont déjà acheté (offres similaires, autorisé par la CNIL), et jamais aux désinscrits.
//    Chaque email porte un lien de désinscription en un clic.

const secret = () => process.env.BETTER_AUTH_SECRET ?? "dev-secret";

/** Jeton de désinscription : signé, pour qu'on ne puisse pas désinscrire quelqu'un d'autre. */
export const unsubscribeToken = (userId: string) => createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url").slice(0, 32);

export function checkUnsubscribeToken(userId: string, token: string) {
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Clic dans l'email : la page de confirmation. Messageries (bouton « Se désinscrire ») : POST direct (RFC 8058).
export const unsubscribeUrl = (userId: string) => `${SITE_URL}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;

export async function setMarketingConsent(userId: string, consent: boolean) {
  await db
    .update(user)
    .set(consent ? { marketingConsentAt: new Date(), marketingOptOutAt: null } : { marketingOptOutAt: new Date() })
    .where(eq(user.id, userId));
}

/** Vrai si ce compte reçoit les campagnes : accord donné ou client, et pas désinscrit. */
export async function receivesMarketing(userId: string) {
  const [row] = await db.select({ consent: user.marketingConsentAt, optOut: user.marketingOptOutAt }).from(user).where(eq(user.id, userId));
  if (!row || row.optOut) return false;
  if (row.consent) return true;
  const [order] = await db
    .select({ id: shopOrder.id })
    .from(shopOrder)
    .where(and(eq(shopOrder.userId, userId), eq(shopOrder.status, "paid"), ne(shopOrder.method, "gift"), ne(shopOrder.method, "free")))
    .limit(1);
  return !!order;
}

/** Découpe un texte en paragraphes (lignes vides) pour le gabarit des emails. */
export const toParagraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** Remplace {prenom} par le prénom du destinataire. */
const personalize = (text: string, name: string) => text.replaceAll("{prenom}", name.trim().split(/\s+/)[0] || "");

// --- Publics des campagnes -------------------------------------------------

export type AudienceOption = { value: string; label: string; hint: string };

export async function getAudienceOptions(): Promise<AudienceOption[]> {
  const plugins = await db.select({ id: product.id, name: product.name }).from(product).where(eq(product.published, true)).orderBy(product.name);
  return [
    { value: "all", label: "Tous les contacts", hint: "Comptes qui acceptent les emails et clients qui ont déjà acheté." },
    { value: "customers", label: "Clients", hint: "Ceux qui ont déjà payé une commande." },
    { value: "subscribers", label: "Abonnés actifs", hint: "Abonnement en cours ou dans sa marge." },
    { value: "trial", label: "En essai gratuit", hint: "Essai de l'abonnement en cours." },
    { value: "no-purchase", label: "Inscrits sans achat", hint: "Ont accepté les emails mais n'ont encore rien acheté." },
    ...plugins.map((p) => ({ value: `product:${p.id}`, label: `Possèdent ${p.name}`, hint: "Achat, cadeau, démo ou abonnement." })),
  ];
}

type Recipient = { id: string; name: string; email: string };

/** Destinataires d'un public, désinscrits et comptes désactivés exclus. */
export async function getAudience(audience: string): Promise<Recipient[]> {
  const buyers = db
    .selectDistinct({ id: shopOrder.userId })
    .from(shopOrder)
    .where(and(eq(shopOrder.status, "paid"), ne(shopOrder.method, "gift"), ne(shopOrder.method, "free")));
  const base = and(isNull(user.marketingOptOutAt), or(isNull(user.banned), eq(user.banned, false)), ne(user.role, "admin"));
  const reachable = and(base, or(isNotNull(user.marketingConsentAt), inArray(user.id, buyers)));
  const pick = { id: user.id, name: user.name, email: user.email };

  if (audience === "all") return db.select(pick).from(user).where(reachable);
  if (audience === "customers") return db.select(pick).from(user).where(and(base, inArray(user.id, buyers)));
  if (audience === "no-purchase") return db.select(pick).from(user).where(and(base, isNotNull(user.marketingConsentAt), notInArray(user.id, buyers)));
  if (audience === "subscribers" || audience === "trial") {
    const subs = await getAdminSubscribers();
    const ids = [...new Set(subs.filter((s) => (audience === "trial" ? s.state === "trial" : s.state === "active" || s.state === "grace")).map((s) => s.userId))];
    return ids.length ? db.select(pick).from(user).where(and(reachable, inArray(user.id, ids))) : [];
  }
  if (audience.startsWith("product:")) {
    const productId = audience.slice("product:".length);
    const owners = db
      .selectDistinct({ id: shopOrder.userId })
      .from(shopOrderItem)
      .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
      .where(and(eq(shopOrder.status, "paid"), eq(shopOrderItem.productId, productId)));
    const licensed = db.selectDistinct({ id: license.userId }).from(license).where(eq(license.productId, productId));
    return db.select(pick).from(user).where(and(reachable, or(inArray(user.id, owners), inArray(user.id, licensed))));
  }
  return [];
}

// --- Envoi ---------------------------------------------------------------------

export type Message = { subject: string; title: string; body: string; ctaLabel?: string | null; ctaHref?: string | null };

const cta = (m: Message) => (m.ctaLabel && m.ctaHref ? { label: m.ctaLabel, href: m.ctaHref } : undefined);

/** Email personnel à un compte (journalisé). */
export async function sendDirect(to: Recipient, m: Message) {
  const ok = await sendEmail({ to: to.email, subject: personalize(m.subject, to.name), title: personalize(m.title, to.name), paragraphs: toParagraphs(personalize(m.body, to.name)), cta: cta(m) });
  await db.insert(emailLog).values({ kind: "direct", userId: to.id, email: to.email, subject: m.subject, ok });
  return ok;
}

/** Version d'essai d'une campagne, envoyée à l'admin (avec le lien de désinscription, pour voir le rendu). */
export async function sendCampaignTest(to: Recipient, m: Message) {
  return sendEmail({
    to: to.email,
    subject: `[Test] ${personalize(m.subject, to.name)}`,
    title: personalize(m.title, to.name),
    paragraphs: toParagraphs(personalize(m.body, to.name)),
    cta: cta(m),
    unsubscribeUrl: unsubscribeUrl(to.id),
  });
}

/**
 * Envoie une campagne déjà créée, destinataire par destinataire (Resend accepte environ 2 emails par seconde),
 * en comptant les envois et les échecs au fur et à mesure.
 */
export async function deliverCampaign(campaignId: string, recipients: Recipient[], m: Message) {
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const ok = await sendEmail({
      to: r.email,
      subject: personalize(m.subject, r.name),
      title: personalize(m.title, r.name),
      paragraphs: toParagraphs(personalize(m.body, r.name)),
      cta: cta(m),
      unsubscribeUrl: unsubscribeUrl(r.id),
    });
    if (ok) sent += 1;
    else failed += 1;
    await db.insert(emailLog).values({ kind: "campaign", campaignId, userId: r.id, email: r.email, subject: m.subject, ok });
    if ((sent + failed) % 10 === 0) await db.update(emailCampaign).set({ sent, failed }).where(eq(emailCampaign.id, campaignId));
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  await db.update(emailCampaign).set({ sent, failed, status: "sent", finishedAt: new Date() }).where(eq(emailCampaign.id, campaignId));
}

export async function getCampaigns() {
  return db.select().from(emailCampaign).orderBy(desc(emailCampaign.createdAt)).limit(50);
}

export async function getDirectEmails() {
  return db
    .select({ id: emailLog.id, email: emailLog.email, subject: emailLog.subject, ok: emailLog.ok, sentAt: emailLog.sentAt, name: user.name })
    .from(emailLog)
    .leftJoin(user, eq(emailLog.userId, user.id))
    .where(eq(emailLog.kind, "direct"))
    .orderBy(desc(emailLog.sentAt))
    .limit(30);
}

/** Combien de comptes reçoivent les campagnes, combien se sont désinscrits. */
export async function getMarketingStats() {
  const [row] = await db
    .select({
      consent: sql<number>`sum(case when ${user.marketingConsentAt} is not null and ${user.marketingOptOutAt} is null then 1 else 0 end)`,
      optOut: sql<number>`sum(case when ${user.marketingOptOutAt} is not null then 1 else 0 end)`,
    })
    .from(user);
  const reachable = (await getAudience("all")).length;
  return { consent: Number(row?.consent ?? 0), optOut: Number(row?.optOut ?? 0), reachable };
}
