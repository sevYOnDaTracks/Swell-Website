"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { emailCampaign, user } from "@/db/schema";
import {
  checkUnsubscribeToken,
  deliverCampaign,
  getAudience,
  getAudienceOptions,
  sendCampaignTest,
  sendDirect,
  setMarketingConsent,
  type Message,
} from "@/lib/marketing";
import { getCurrentUser, requireAdmin, requireUser } from "@/lib/session";

/** Lien d'un bouton d'email : une adresse https ou une page du site. */
const validHref = (href: string) => /^https:\/\/\S+$/.test(href) || /^\/(?!\/)\S*$/.test(href);

function readMessage(input: Message): { message: Message } | { error: string } {
  const subject = input.subject.trim().slice(0, 140);
  const title = (input.title?.trim() || subject).slice(0, 140);
  const body = input.body.trim().slice(0, 10000);
  const ctaLabel = input.ctaLabel?.trim().slice(0, 40) || null;
  let ctaHref = input.ctaHref?.trim() || null;
  if (!subject) return { error: "Indique l'objet de l'email." };
  if (body.length < 5) return { error: "Écris le message." };
  if (ctaHref && !validHref(ctaHref)) return { error: "Lien du bouton invalide : une page du site (/boutique…) ou une adresse https." };
  if (ctaHref?.startsWith("/")) ctaHref = `${process.env.BETTER_AUTH_URL ?? "https://swell-audio.fr"}${ctaHref}`;
  if ((ctaLabel && !ctaHref) || (!ctaLabel && ctaHref)) return { error: "Le bouton a besoin d'un texte et d'un lien." };
  return { message: { subject, title, body, ctaLabel, ctaHref } };
}

// --- Consentement ----------------------------------------------------------------

/** Le client accepte ou refuse les emails de nouveautés et de promos (inscription, profil). */
export async function setMyMarketingConsent(consent: boolean) {
  const me = await getCurrentUser();
  if (!me) return;
  await setMarketingConsent(me.id, consent);
  refresh();
}

/** Désinscription depuis le lien d'un email (sans connexion, avec le jeton signé). */
export async function unsubscribe(userId: string, token: string): Promise<{ ok: true } | { error: string }> {
  if (!userId || !token || !checkUnsubscribeToken(userId, token)) return { error: "Ce lien de désinscription n'est pas valable." };
  await setMarketingConsent(userId, false);
  return { ok: true };
}

// --- Admin -----------------------------------------------------------------------

/** Email personnel à un compte. */
export async function sendDirectEmail(userId: string, input: Message): Promise<{ ok: true; email: string } | { error: string }> {
  await requireAdmin();
  const parsed = readMessage(input);
  if ("error" in parsed) return parsed;
  const [to] = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, userId));
  if (!to) return { error: "Ce compte n'existe plus." };
  const ok = await sendDirect(to, parsed.message);
  refresh();
  return ok ? { ok: true, email: to.email } : { error: "L'email n'a pas pu partir. Réessaie dans un instant." };
}

/** Nombre de destinataires d'un public (avant l'envoi). */
export async function countAudience(audience: string) {
  await requireAdmin();
  return (await getAudience(audience)).length;
}

/** Envoie la campagne en test à l'admin. */
export async function sendTestCampaign(input: Message): Promise<{ ok: true; email: string } | { error: string }> {
  const admin = await requireAdmin();
  const parsed = readMessage(input);
  if ("error" in parsed) return parsed;
  const ok = await sendCampaignTest({ id: admin.id, name: admin.name, email: admin.email }, parsed.message);
  return ok ? { ok: true, email: admin.email } : { error: "L'email de test n'a pas pu partir." };
}

/** Crée la campagne et l'envoie en arrière-plan au public choisi. */
export async function sendCampaign(input: Message & { audience: string }): Promise<{ ok: true; recipients: number } | { error: string }> {
  await requireAdmin();
  const parsed = readMessage(input);
  if ("error" in parsed) return parsed;
  const option = (await getAudienceOptions()).find((o) => o.value === input.audience);
  if (!option) return { error: "Choisis un public." };
  const recipients = await getAudience(option.value);
  if (recipients.length === 0) return { error: "Personne dans ce public pour l'instant." };
  const [campaign] = await db
    .insert(emailCampaign)
    .values({ ...parsed.message, audience: option.value, audienceLabel: option.label, recipients: recipients.length })
    .returning({ id: emailCampaign.id });
  after(() => deliverCampaign(campaign.id, recipients, parsed.message));
  refresh();
  return { ok: true, recipients: recipients.length };
}

/** Le client connecté voit et change son choix depuis son profil. */
export async function getMyMarketingConsent() {
  const me = await requireUser();
  const [row] = await db.select({ consent: user.marketingConsentAt, optOut: user.marketingOptOutAt }).from(user).where(eq(user.id, me.id));
  return !!row?.consent && !row.optOut;
}
