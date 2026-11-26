"use server";

import { and, count, eq } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { shopOrder, shopOrderItem, user as userTable } from "@/db/schema";
import { sendEmail, SITE_URL } from "@/lib/email";
import { sendOrderEmails } from "@/lib/order-emails";
import { getPaymentOptions, newOrderReference } from "@/lib/orders";
import type { PayMethod } from "@/lib/payments";
import { resolvePromo } from "@/lib/promos";
import { slugify } from "@/lib/shop";
import { getCurrentUser, hasConfirmedEmail, requireAdmin } from "@/lib/session";
import {
  findFormula,
  isPlan,
  passName,
  planDays,
  planEnabled,
  planPrice,
  type Formula,
  type SubscriptionSettings,
} from "@/lib/subscription-plans";
import {
  getSubscriptionSettings,
  getVstPlugins,
  giftSubscriptionDays,
  saveSubscriptionSettings,
  startSubscriptionTrial,
  SUBSCRIPTION_TAG,
  syncSubscriptionOrders,
} from "@/lib/subscriptions";

const MAX_PENDING_ORDERS = 5;
const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

type Gate = { needsAccount: true } | { needsVerification: true } | { error: string };

/** Essai gratuit (formule choisie dans l'admin), depuis la page /abonnement. */
export async function startAllAccessTrial(): Promise<{ ok: true } | Gate> {
  const user = await getCurrentUser();
  if (!user) return { needsAccount: true };
  if (!hasConfirmedEmail(user)) return { needsVerification: true };

  const result = await startSubscriptionTrial(user.id);
  if ("error" in result) return result;

  const settings = await getSubscriptionSettings();
  after(() =>
    sendEmail({
      to: user.email,
      subject: `Ton essai ${result.formula.name} commence 🎧`,
      title: `${settings.trialDays} jours pour essayer ${result.formula.name}`,
      paragraphs: [
        `Ton essai est actif jusqu'au ${longDate.format(result.endsAt)}.`,
        "Les plugins de la formule sont dans ton espace, chacun avec sa clé de licence : télécharge ceux que tu veux, puis colle la clé au premier lancement.",
        "Pour continuer après l'essai, prends un pass d'un mois ou d'un an : les mêmes clés continuent de marcher, rien à réinstaller.",
      ],
      cta: { label: "Ouvrir mon espace", href: `${SITE_URL}/compte/plugins` },
    }),
  );
  refresh();
  return { ok: true };
}

/** Formule et pass demandés, vérifiés sur le serveur. */
function pickPass(settings: SubscriptionSettings, formulaId: string, plan: string) {
  const formula = findFormula(settings, formulaId);
  if (!formula || !formula.visible) return { error: "Choisis une formule." } as const;
  if (!isPlan(plan) || !planEnabled(formula, plan)) return { error: "Ce pass n'est pas proposé." } as const;
  return { formula, plan } as const;
}

/** Essai d'un code promo sur un pass, avant la commande (la remise est recalculée à la commande). */
export async function checkSubscriptionPromo(rawCode: string, formulaId: string, plan: string) {
  const settings = await getSubscriptionSettings();
  const pass = pickPass(settings, formulaId, plan);
  if ("error" in pass) return { error: pass.error };
  const user = await getCurrentUser();
  return resolvePromo(String(rawCode), planPrice(settings, pass.formula, pass.plan, Date.now()), user?.id);
}

/**
 * Commande d'un pass d'abonnement, payée comme une commande de la boutique.
 * Quand l'admin valide le paiement, la période d'accès est ajoutée (syncSubscriptionOrders).
 */
export async function createSubscriptionOrder(
  formulaId: string,
  plan: string,
  waivedWithdrawal: boolean,
  method: PayMethod,
  rawPromoCode?: string,
): Promise<{ ok: true; reference: string; paid: boolean } | Gate> {
  const user = await getCurrentUser();
  if (!user) return { needsAccount: true };
  if (!hasConfirmedEmail(user)) return { needsVerification: true };
  if (!waivedWithdrawal) return { error: "Coche la case pour continuer." };

  const settings = await getSubscriptionSettings();
  if (!settings.enabled) return { error: "L'abonnement n'est pas encore ouvert." };
  const pass = pickPass(settings, formulaId, plan);
  if ("error" in pass) return { error: pass.error ?? "Choisis une formule." };

  const [pending] = await db
    .select({ total: count() })
    .from(shopOrder)
    .where(and(eq(shopOrder.userId, user.id), eq(shopOrder.status, "pending")));
  if (pending.total >= MAX_PENDING_ORDERS) return { error: "Tu as déjà plusieurs commandes en attente : règle-les d'abord." };

  const price = planPrice(settings, pass.formula, pass.plan, Date.now());
  const promo = rawPromoCode?.trim() ? await resolvePromo(rawPromoCode, price, user.id) : null;
  if (promo && "error" in promo) return { error: promo.error ?? "Ce code promo n'est pas valable." };
  const discountCents = promo?.discountCents ?? 0;
  const total = price - discountCents;

  const coveredByPromo = total === 0;
  if (!coveredByPromo && !getPaymentOptions()[method]) return { error: "Ce moyen de paiement n'est pas encore ouvert." };

  const orderId = crypto.randomUUID();
  const reference = newOrderReference();
  db.transaction((tx) => {
    tx.insert(shopOrder)
      .values({
        id: orderId,
        userId: user.id,
        reference,
        method: coveredByPromo ? "free" : method,
        status: coveredByPromo ? "paid" : "pending",
        paidAt: coveredByPromo ? new Date() : null,
        totalCents: total,
        promoCode: promo?.code ?? null,
        discountCents,
        withdrawalWaivedAt: new Date(),
      })
      .run();
    tx.insert(shopOrderItem)
      .values({
        orderId,
        productId: null,
        name: `Abonnement ${passName(pass.formula, pass.plan)}`,
        priceCents: price,
        subscriptionDays: planDays(pass.formula, pass.plan),
        subscriptionFormula: pass.formula.id,
      })
      .run();
  });

  if (coveredByPromo) await syncSubscriptionOrders(user.id);
  after(() => sendOrderEmails(orderId, coveredByPromo ? "paid" : "created"));
  return { ok: true, reference, paid: coveredByPromo };
}

// --- Admin -------------------------------------------------------------------

const euros = (value: string) => {
  const clean = value.trim().replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(clean) ? Math.round(Number(clean) * 100) : null;
};

export type FormulaInput = {
  // Vide pour une nouvelle formule : l'identifiant est tiré du nom.
  id: string;
  name: string;
  description: string;
  visible: boolean;
  highlighted: boolean;
  monthEnabled: boolean;
  month: string;
  monthDays: string;
  monthSale: string;
  yearEnabled: boolean;
  year: string;
  yearDays: string;
  yearSale: string;
  allPlugins: boolean;
  // Plugins cochés (compris dans la formule).
  includedProductIds: string[];
};

export type SubscriptionSettingsInput = {
  enabled: boolean;
  formulas: FormulaInput[];
  saleEndsAt: string;
  trialDays: string;
  // Position dans la liste de la formule donnée par l'essai (marche aussi pour une formule qui vient d'être ajoutée).
  trialFormulaIndex: number;
  graceDays: string;
  reminderDays: string;
  trialReminderDays: string;
};

const int = (v: string, min: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** Vérifie une formule saisie dans l'admin. */
function parseFormula(input: FormulaInput, pluginIds: string[], usedIds: Set<string>): Formula | { error: string } {
  const name = input.name.trim().slice(0, 60);
  if (!name) return { error: "Chaque formule a besoin d'un nom." };
  const label = `« ${name} »`;
  const monthCents = euros(input.month);
  const yearCents = euros(input.year);
  if (input.monthEnabled && (!monthCents || monthCents <= 0)) return { error: `Prix du pass 1 mois invalide pour ${label} (ex : 7,99).` };
  if (input.yearEnabled && (!yearCents || yearCents <= 0)) return { error: `Prix du pass 1 an invalide pour ${label} (ex : 69).` };
  const monthDays = int(input.monthDays, 1, 366);
  const yearDays = int(input.yearDays, 1, 1100);
  if (!monthDays || !yearDays) return { error: `Durée d'un pass invalide pour ${label} (en jours).` };
  const sale = (raw: string, regular: number | null, pass: string) => {
    if (!raw.trim()) return { value: null };
    const cents = euros(raw);
    if (!cents || cents <= 0 || (regular !== null && cents >= regular)) return { error: `Le prix promo du pass ${pass} de ${label} doit être plus bas que son prix normal.` };
    return { value: cents };
  };
  const monthSale = sale(input.monthSale, monthCents, "1 mois");
  if ("error" in monthSale) return { error: monthSale.error! };
  const yearSale = sale(input.yearSale, yearCents, "1 an");
  if ("error" in yearSale) return { error: yearSale.error! };

  let id = input.id;
  if (!id) {
    const base = slugify(name) || "formule";
    id = base;
    for (let i = 2; usedIds.has(id); i++) id = `${base}-${i}`;
  }
  usedIds.add(id);
  const included = input.includedProductIds.filter((p) => pluginIds.includes(p));
  if (!input.allPlugins && included.length === 0) return { error: `Coche au moins un plugin pour ${label}.` };

  return {
    id,
    name,
    description: input.description.trim().slice(0, 200),
    visible: input.visible,
    highlighted: input.highlighted,
    monthEnabled: input.monthEnabled,
    monthCents: monthCents ?? 0,
    monthDays,
    monthSaleCents: monthSale.value,
    yearEnabled: input.yearEnabled,
    yearCents: yearCents ?? 0,
    yearDays,
    yearSaleCents: yearSale.value,
    allPlugins: input.allPlugins,
    // Tous les plugins : on garde ceux décochés, pour que les prochains plugins publiés entrent d'office.
    excludedProductIds: input.allPlugins ? pluginIds.filter((p) => !included.includes(p)) : [],
    productIds: input.allPlugins ? [] : included,
  };
}

export async function updateSubscriptionSettings(input: SubscriptionSettingsInput): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  if (input.formulas.length === 0) return { error: "Garde au moins une formule." };
  if (input.formulas.length > 8) return { error: "8 formules au maximum." };

  const pluginIds = (await getVstPlugins()).map((p) => p.id);
  const current = await getSubscriptionSettings();
  // Les identifiants existants sont réservés : une formule supprimée puis recréée ne reprend pas ses abonnés.
  const usedIds = new Set(current.formulas.map((f) => f.id).filter((id) => !input.formulas.some((f) => f.id === id)));
  for (const f of input.formulas) if (f.id) usedIds.add(f.id);
  const formulas: Formula[] = [];
  for (const raw of input.formulas) {
    const parsed = parseFormula(raw, pluginIds, usedIds);
    if ("error" in parsed) return parsed;
    formulas.push(parsed);
  }
  if (!formulas.some((f) => f.visible && (f.monthEnabled || f.yearEnabled))) return { error: "Garde au moins une formule visible avec un pass ouvert." };

  const saleEnd = input.saleEndsAt ? new Date(`${input.saleEndsAt}T23:59:59`) : null;
  if (saleEnd && Number.isNaN(saleEnd.getTime())) return { error: "Date de fin de promo invalide." };
  const trialDays = int(input.trialDays, 0, 60);
  const graceDays = int(input.graceDays, 0, 14);
  const reminderDays = int(input.reminderDays, 1, 30);
  const trialReminderDays = int(input.trialReminderDays, 1, 30);
  if (trialDays === null) return { error: "L'essai doit durer de 0 à 60 jours." };
  if (graceDays === null) return { error: "La marge doit être de 0 à 14 jours." };
  if (reminderDays === null || trialReminderDays === null) return { error: "Les rappels se règlent entre 1 et 30 jours avant la fin." };
  const trialFormula = formulas[input.trialFormulaIndex] ?? formulas[0];
  const anySale = formulas.some((f) => f.monthSaleCents || f.yearSaleCents);

  const value: SubscriptionSettings = {
    enabled: input.enabled,
    formulas,
    saleEndsAt: anySale && saleEnd ? saleEnd.toISOString() : null,
    trialDays,
    trialFormulaId: trialFormula.id,
    graceDays,
    reminderDays,
    trialReminderDays,
  };
  await saveSubscriptionSettings(value);
  updateTag(SUBSCRIPTION_TAG);
  refresh();
  return { ok: true };
}

/** Offre des jours d'une formule à un compte (retrouvé par son email). */
export async function giftSubscription(
  email: string,
  formulaId: string,
  rawDays: string,
  rawNote: string,
): Promise<{ ok: true; name: string } | { error: string }> {
  await requireAdmin();
  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 730) return { error: "Indique un nombre de jours entre 1 et 730." };
  const settings = await getSubscriptionSettings();
  const formula = findFormula(settings, formulaId);
  if (!formula) return { error: "Choisis une formule." };
  const [target] = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.email, email.trim().toLowerCase()));
  if (!target) return { error: "Aucun compte avec cet email." };
  const note = rawNote.trim().slice(0, 300) || null;
  await giftSubscriptionDays(target.id, formula.id, days, note);
  after(() =>
    sendEmail({
      to: target.email,
      subject: `Swell t'offre ${days} jours d'abonnement ${formula.name} 🎁`,
      title: "Un cadeau t'attend",
      paragraphs: [
        `Swell t'offre ${days} jours d'accès à la formule ${formula.name}.`,
        ...(note ? [`« ${note} »`] : []),
        "Les plugins et leurs clés de licence sont dans ton espace.",
      ],
      cta: { label: "Ouvrir mon espace", href: `${SITE_URL}/compte/plugins` },
    }),
  );
  refresh();
  return { ok: true, name: target.name };
}
