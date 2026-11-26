import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, max, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { license, product, setting, shopOrder, shopOrderItem, subscriptionPeriod, trialMachine, user } from "@/db/schema";
import { newLicenseKey } from "./licenses";
import { DEFAULT_SUBSCRIPTION_SETTINGS, type SubscriptionSettings } from "./subscription-plans";

// Abonnement Swell All Access, prépayé comme le reste de la boutique (PayPal, Wero, virement, mobile money).
//
// 1. Le client achète un pass (1 mois ou 1 an). Quand l'admin valide le paiement, une période d'accès
//    est ajoutée à la suite de la précédente : renouveler en avance ne fait perdre aucun jour.
// 2. L'essai gratuit est une période comme les autres (kind "trial"), une seule fois par compte
//    et par ordinateur (trial_machine, vérifié à l'activation dans le plugin).
// 3. Pendant l'accès, le client a une clé par plugin (license.viaSubscription). Le plugin reçoit un
//    fichier de licence qui expire à la fin de l'accès (+ quelques jours de marge après un pass payé),
//    et le redemande à chaque chargement : après un renouvellement, il se débloque tout seul.

const DAY = 24 * 60 * 60 * 1000;
const SETTINGS_KEY = "subscription";

export async function getSubscriptionSettings(): Promise<SubscriptionSettings> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, SETTINGS_KEY));
  if (!row) return DEFAULT_SUBSCRIPTION_SETTINGS;
  try {
    return { ...DEFAULT_SUBSCRIPTION_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_SUBSCRIPTION_SETTINGS;
  }
}

export const SUBSCRIPTION_TAG = "subscription";

/** Réglages lus par les pages publiques (mis en cache, invalidés à chaque modification dans l'admin). */
export async function getPublicSubscriptionSettings() {
  "use cache";
  cacheTag(SUBSCRIPTION_TAG);
  const settings = await getSubscriptionSettings();
  // Promo des pass datée : le cache expire à sa fin pour que le prix normal revienne tout seul.
  const end = settings.saleEndsAt ? new Date(settings.saleEndsAt).getTime() - Date.now() : null;
  if (end !== null && end > 0) {
    const seconds = Math.max(60, Math.ceil(end / 1000));
    cacheLife({ stale: 30, revalidate: seconds, expire: seconds + 60 });
    return settings;
  }
  cacheLife("max");
  // Promo terminée : retirée ici, une fois pour toutes les pages publiques.
  return end !== null ? { ...settings, monthSaleCents: null, yearSaleCents: null } : settings;
}

export async function saveSubscriptionSettings(value: SubscriptionSettings) {
  const json = JSON.stringify(value);
  await db.insert(setting).values({ key: SETTINGS_KEY, value: json }).onConflictDoUpdate({ target: setting.key, set: { value: json } });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Ajoute une période d'accès à la suite de la dernière (ou à partir de maintenant si l'accès est fini). */
function addPeriod(tx: Tx, input: { userId: string; kind: "trial" | "paid" | "gift"; days: number; orderId?: string; note?: string | null }) {
  const [row] = tx
    .select({ end: max(subscriptionPeriod.endsAt) })
    .from(subscriptionPeriod)
    .where(eq(subscriptionPeriod.userId, input.userId))
    .all();
  const now = Date.now();
  const start = Math.max(now, row?.end ? new Date(row.end).getTime() : 0);
  tx.insert(subscriptionPeriod)
    .values({
      userId: input.userId,
      kind: input.kind,
      orderId: input.orderId ?? null,
      days: input.days,
      startsAt: new Date(start),
      endsAt: new Date(start + input.days * DAY),
      note: input.note ?? null,
    })
    .onConflictDoNothing()
    .run();
}

/**
 * Transforme les pass payés en périodes d'accès. Appelée à la validation d'une commande et à chaque lecture
 * de l'abonnement : quel que soit le chemin qui a validé la commande, aucun pass payé ne reste sans accès.
 */
export async function syncSubscriptionOrders(userId: string) {
  const missing = await db
    .select({ orderId: shopOrder.id, days: shopOrderItem.subscriptionDays })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .leftJoin(subscriptionPeriod, eq(subscriptionPeriod.orderId, shopOrder.id))
    .where(and(eq(shopOrder.userId, userId), eq(shopOrder.status, "paid"), isNotNull(shopOrderItem.subscriptionDays), isNull(subscriptionPeriod.id)))
    .orderBy(asc(shopOrder.paidAt));
  if (missing.length === 0) return;
  db.transaction((tx) => {
    for (const m of missing) addPeriod(tx, { userId, kind: "paid", days: m.days!, orderId: m.orderId });
  });
  await ensureSubscriptionLicenses(userId);
}

export type SubscriptionState = "none" | "trial" | "active" | "grace" | "expired";

/** État de l'abonnement d'un client. */
export async function getSubscription(userId: string) {
  await syncSubscriptionOrders(userId);
  const [settings, periods] = await Promise.all([
    getSubscriptionSettings(),
    db.select().from(subscriptionPeriod).where(eq(subscriptionPeriod.userId, userId)).orderBy(asc(subscriptionPeriod.endsAt)),
  ]);
  const trialUsed = periods.some((p) => p.kind === "trial");
  const hasPaid = periods.some((p) => p.kind !== "trial");
  if (periods.length === 0) {
    return { state: "none" as SubscriptionState, endsAt: null, accessEndsAt: null, trialUsed, hasPaid, periods };
  }
  const last = periods[periods.length - 1];
  const now = Date.now();
  const endsAt = last.endsAt;
  // Marge après un pass payé (le temps de valider un renouvellement à la main). Pas de marge après l'essai.
  const accessEndsAt = last.kind === "trial" ? endsAt : new Date(endsAt.getTime() + settings.graceDays * DAY);
  const current = periods.find((p) => p.startsAt.getTime() <= now && now < p.endsAt.getTime());
  const state: SubscriptionState =
    now < endsAt.getTime() ? (current?.kind === "trial" && !hasPaid ? "trial" : "active") : now < accessEndsAt.getTime() ? "grace" : "expired";
  return { state, endsAt, accessEndsAt, trialUsed, hasPaid, periods };
}

export const hasAccess = (state: SubscriptionState) => state === "trial" || state === "active" || state === "grace";

/** Vrai si l'abonnement de ce client donne accès aux plugins (essai, actif ou dans la marge). */
export async function hasSubscriptionAccess(userId: string) {
  return hasAccess((await getSubscription(userId)).state);
}

/** Fin de l'accès pour les fichiers de licence, et si le client n'a jamais eu que l'essai. */
export async function subscriptionLicenseWindow(userId: string) {
  const sub = await getSubscription(userId);
  return sub.accessEndsAt ? { endsAt: sub.accessEndsAt, trialOnly: !sub.hasPaid, state: sub.state } : null;
}

/** Plugins compris dans l'abonnement : les VST publiés et disponibles, sauf ceux retirés dans l'admin. */
export async function getSubscriptionPlugins() {
  const [{ excludedProductIds }, rows] = await Promise.all([getSubscriptionSettings(), getVstPlugins()]);
  return rows.filter((p) => !excludedProductIds.includes(p.id));
}

/** Vrai si ce plugin fait partie de l'abonnement. */
export async function isInSubscription(productId: string) {
  const { excludedProductIds } = await getSubscriptionSettings();
  return !excludedProductIds.includes(productId);
}

/** Tous les VST publiés et disponibles (liste des cases à cocher de l'admin). */
export async function getVstPlugins() {
  return db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      coverFile: product.coverFile,
      priceCents: product.priceCents,
      installerMacSize: product.installerMacSize,
      installerWinSize: product.installerWinSize,
    })
    .from(product)
    .where(and(eq(product.type, "vst"), eq(product.published, true), isNotNull(product.downloadFile)))
    .orderBy(desc(product.createdAt));
}

/**
 * Une clé par plugin de l'abonnement pour ce client (s'il a eu au moins une période).
 * Les plugins achetés gardent leur clé définitive ; une clé de démo passe sur l'abonnement.
 */
export async function ensureSubscriptionLicenses(userId: string) {
  const [any] = await db.select({ id: subscriptionPeriod.id }).from(subscriptionPeriod).where(eq(subscriptionPeriod.userId, userId)).limit(1);
  if (!any) return;
  const plugins = await getSubscriptionPlugins();
  if (plugins.length === 0) return;
  for (const p of plugins) {
    await db
      .insert(license)
      .values({ key: newLicenseKey(), userId, productId: p.id, productSlug: p.slug, productName: p.name, viaSubscription: true })
      .onConflictDoNothing({ target: [license.userId, license.productSlug] });
  }
  await db
    .update(license)
    .set({ viaSubscription: true, maxActivations: 3 })
    .where(
      and(
        eq(license.userId, userId),
        isNotNull(license.trialEndsAt),
        eq(license.viaSubscription, false),
        inArray(
          license.productSlug,
          plugins.map((p) => p.slug),
        ),
      ),
    );
}

/** Lance l'essai gratuit de toute la gamme (une seule fois par compte). */
export async function startSubscriptionTrial(userId: string): Promise<{ ok: true; endsAt: Date } | { error: string }> {
  const settings = await getSubscriptionSettings();
  if (!settings.enabled || settings.trialDays <= 0) return { error: "L'essai gratuit n'est pas ouvert pour le moment." };
  const sub = await getSubscription(userId);
  if (sub.trialUsed) return { error: "Tu as déjà profité de l'essai gratuit." };
  if (sub.periods.length > 0) return { error: "Tu as déjà un abonnement : l'essai est réservé aux nouveaux abonnés." };
  db.transaction((tx) => addPeriod(tx, { userId, kind: "trial", days: settings.trialDays }));
  await ensureSubscriptionLicenses(userId);
  const fresh = await getSubscription(userId);
  return { ok: true, endsAt: fresh.endsAt! };
}

/** L'admin offre des jours d'accès à un compte. */
export async function giftSubscriptionDays(userId: string, days: number, note: string | null) {
  db.transaction((tx) => addPeriod(tx, { userId, kind: "gift", days, note }));
  await ensureSubscriptionLicenses(userId);
}

/**
 * Un seul essai gratuit par ordinateur : le premier compte qui active un plugin d'essai sur cet ordinateur
 * le garde. Renvoie false si l'ordinateur a déjà servi à l'essai d'un autre compte.
 */
export async function claimTrialMachine(userId: string, machineId: string) {
  await db.insert(trialMachine).values({ machineId, userId }).onConflictDoNothing();
  const [row] = await db.select({ userId: trialMachine.userId }).from(trialMachine).where(eq(trialMachine.machineId, machineId));
  return !row || row.userId === userId;
}

/** Abonnés pour l'admin : fin de l'accès, type de la dernière période, nombre de pass payés. */
export async function getAdminSubscribers() {
  const settings = await getSubscriptionSettings();
  const rows = await db
    .select({
      userId: subscriptionPeriod.userId,
      name: user.name,
      email: user.email,
      endsAt: max(subscriptionPeriod.endsAt),
      since: sql<number>`min(${subscriptionPeriod.startsAt})`,
      paid: sql<number>`sum(case when ${subscriptionPeriod.kind} = 'paid' then 1 else 0 end)`,
      gifts: sql<number>`sum(case when ${subscriptionPeriod.kind} = 'gift' then 1 else 0 end)`,
      trial: sql<number>`sum(case when ${subscriptionPeriod.kind} = 'trial' then 1 else 0 end)`,
    })
    .from(subscriptionPeriod)
    .innerJoin(user, eq(subscriptionPeriod.userId, user.id))
    .groupBy(subscriptionPeriod.userId)
    .orderBy(desc(max(subscriptionPeriod.endsAt)));
  const now = Date.now();
  return rows.map((r) => {
    const endsAt = new Date(r.endsAt as unknown as number);
    const hasPaid = r.paid + r.gifts > 0;
    const accessEndsAt = hasPaid ? endsAt.getTime() + settings.graceDays * DAY : endsAt.getTime();
    const state: SubscriptionState = now < endsAt.getTime() ? (hasPaid ? "active" : "trial") : now < accessEndsAt ? "grace" : "expired";
    return { ...r, endsAt, since: new Date(r.since), state, convertedFromTrial: r.trial > 0 && r.paid > 0 };
  });
}

/** Chiffre des pass payés sur les 30 derniers jours. */
export async function getSubscriptionRevenue30d() {
  const since = new Date(Date.now() - 30 * DAY);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${shopOrder.totalCents}), 0)`, count: sql<number>`count(*)` })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .where(and(isNotNull(shopOrderItem.subscriptionDays), eq(shopOrder.status, "paid"), sql`${shopOrder.paidAt} >= ${since.getTime()}`));
  return row;
}
