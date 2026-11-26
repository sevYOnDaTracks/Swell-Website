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
import { getCurrentUser, hasConfirmedEmail, requireAdmin } from "@/lib/session";
import { isPlan, PLANS, planDays, planEnabled, planPrice, SUBSCRIPTION_NAME, type SubscriptionSettings } from "@/lib/subscription-plans";
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

/** Essai gratuit de toute la gamme, depuis la page /abonnement. */
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
      subject: `Ton essai ${SUBSCRIPTION_NAME} commence 🎧`,
      title: `${settings.trialDays} jours pour essayer tous les plugins Swell`,
      paragraphs: [
        `Ton essai est actif jusqu'au ${longDate.format(result.endsAt)}.`,
        "Tous les plugins sont dans ton espace, chacun avec sa clé de licence : télécharge ceux que tu veux, puis colle la clé au premier lancement.",
        "Pour continuer après l'essai, prends un pass d'un mois ou d'un an : les mêmes clés continuent de marcher, rien à réinstaller.",
      ],
      cta: { label: "Ouvrir mon espace", href: `${SITE_URL}/compte/plugins` },
    }),
  );
  refresh();
  return { ok: true };
}

/** Essai d'un code promo sur un pass, avant la commande (la remise est recalculée à la commande). */
export async function checkSubscriptionPromo(rawCode: string, plan: string) {
  if (!isPlan(plan)) return { error: "Choisis une formule." };
  const settings = await getSubscriptionSettings();
  if (!planEnabled(settings, plan)) return { error: "Cette formule n'est pas proposée." };
  const user = await getCurrentUser();
  return resolvePromo(String(rawCode), planPrice(settings, plan, Date.now()), user?.id);
}

/**
 * Commande d'un pass d'abonnement, payée comme une commande de la boutique.
 * Quand l'admin valide le paiement, la période d'accès est ajoutée (syncSubscriptionOrders).
 */
export async function createSubscriptionOrder(
  plan: string,
  waivedWithdrawal: boolean,
  method: PayMethod,
  rawPromoCode?: string,
): Promise<{ ok: true; reference: string; paid: boolean } | Gate> {
  const user = await getCurrentUser();
  if (!user) return { needsAccount: true };
  if (!hasConfirmedEmail(user)) return { needsVerification: true };
  if (!isPlan(plan)) return { error: "Choisis une formule." };
  if (!waivedWithdrawal) return { error: "Coche la case pour continuer." };

  const settings = await getSubscriptionSettings();
  if (!settings.enabled) return { error: "L'abonnement n'est pas encore ouvert." };
  if (!planEnabled(settings, plan)) return { error: "Cette formule n'est pas proposée." };

  const [pending] = await db
    .select({ total: count() })
    .from(shopOrder)
    .where(and(eq(shopOrder.userId, user.id), eq(shopOrder.status, "pending")));
  if (pending.total >= MAX_PENDING_ORDERS) return { error: "Tu as déjà plusieurs commandes en attente : règle-les d'abord." };

  const price = planPrice(settings, plan, Date.now());
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
      .values({ orderId, productId: null, name: `${SUBSCRIPTION_NAME} · ${PLANS[plan].label}`, priceCents: price, subscriptionDays: planDays(settings, plan) })
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

export type SubscriptionSettingsInput = {
  enabled: boolean;
  monthEnabled: boolean;
  month: string;
  monthDays: string;
  monthSale: string;
  yearEnabled: boolean;
  year: string;
  yearDays: string;
  yearSale: string;
  saleEndsAt: string;
  trialDays: string;
  graceDays: string;
  reminderDays: string;
  trialReminderDays: string;
  includedProductIds: string[];
};

export async function updateSubscriptionSettings(input: SubscriptionSettingsInput): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const int = (v: string, min: number, max: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
  };
  const monthCents = euros(input.month);
  const yearCents = euros(input.year);
  if (!monthCents || monthCents <= 0) return { error: "Prix du pass 1 mois invalide (ex : 7,99)." };
  if (!yearCents || yearCents <= 0) return { error: "Prix du pass 1 an invalide (ex : 69)." };
  if (!input.monthEnabled && !input.yearEnabled) return { error: "Garde au moins une formule ouverte." };
  const monthDays = int(input.monthDays, 1, 366);
  const yearDays = int(input.yearDays, 1, 1100);
  if (!monthDays || !yearDays) return { error: "Durée d'un pass invalide (en jours)." };

  const sale = (raw: string, regular: number, label: string) => {
    if (!raw.trim()) return { value: null };
    const cents = euros(raw);
    if (!cents || cents <= 0 || cents >= regular) return { error: `Le prix promo du pass ${label} doit être plus bas que son prix normal.` };
    return { value: cents };
  };
  const monthSale = sale(input.monthSale, monthCents, "1 mois");
  if ("error" in monthSale) return { error: monthSale.error! };
  const yearSale = sale(input.yearSale, yearCents, "1 an");
  if ("error" in yearSale) return { error: yearSale.error! };
  const saleEnd = input.saleEndsAt ? new Date(`${input.saleEndsAt}T23:59:59`) : null;
  if (saleEnd && Number.isNaN(saleEnd.getTime())) return { error: "Date de fin de promo invalide." };

  const trialDays = int(input.trialDays, 0, 60);
  const graceDays = int(input.graceDays, 0, 14);
  const reminderDays = int(input.reminderDays, 1, 30);
  const trialReminderDays = int(input.trialReminderDays, 1, 30);
  if (trialDays === null) return { error: "L'essai doit durer de 0 à 60 jours." };
  if (graceDays === null) return { error: "La marge doit être de 0 à 14 jours." };
  if (reminderDays === null || trialReminderDays === null) return { error: "Les rappels se règlent entre 1 et 30 jours avant la fin." };

  // Les cases cochées sont les plugins compris : on garde la liste de ceux retirés,
  // pour que les prochains plugins publiés entrent d'office dans l'abonnement.
  const plugins = await getVstPlugins();
  const excludedProductIds = plugins.filter((p) => !input.includedProductIds.includes(p.id)).map((p) => p.id);

  const value: SubscriptionSettings = {
    enabled: input.enabled,
    monthEnabled: input.monthEnabled,
    monthCents,
    monthDays,
    yearEnabled: input.yearEnabled,
    yearCents,
    yearDays,
    monthSaleCents: monthSale.value,
    yearSaleCents: yearSale.value,
    saleEndsAt: (monthSale.value || yearSale.value) && saleEnd ? saleEnd.toISOString() : null,
    trialDays,
    graceDays,
    reminderDays,
    trialReminderDays,
    excludedProductIds,
  };
  await saveSubscriptionSettings(value);
  updateTag(SUBSCRIPTION_TAG);
  refresh();
  return { ok: true };
}

/** Offre des jours d'abonnement à un compte (retrouvé par son email). */
export async function giftSubscription(email: string, rawDays: string, rawNote: string): Promise<{ ok: true; name: string } | { error: string }> {
  await requireAdmin();
  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 730) return { error: "Indique un nombre de jours entre 1 et 730." };
  const [target] = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.email, email.trim().toLowerCase()));
  if (!target) return { error: "Aucun compte avec cet email." };
  const note = rawNote.trim().slice(0, 300) || null;
  await giftSubscriptionDays(target.id, days, note);
  after(() =>
    sendEmail({
      to: target.email,
      subject: `Swell t'offre ${days} jours de ${SUBSCRIPTION_NAME} 🎁`,
      title: "Un cadeau t'attend",
      paragraphs: [
        `Swell t'offre ${days} jours d'accès à tous les plugins.`,
        ...(note ? [`« ${note} »`] : []),
        "Les plugins et leurs clés de licence sont dans ton espace.",
      ],
      cta: { label: "Ouvrir mon espace", href: `${SITE_URL}/compte/plugins` },
    }),
  );
  refresh();
  return { ok: true, name: target.name };
}
