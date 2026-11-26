import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { license, product, setting, shopOrder, shopOrderItem, subscriptionPeriod, trialMachine, user } from "@/db/schema";
import { newLicenseKey } from "./licenses";
import {
  DEFAULT_FORMULA_ID,
  DEFAULT_SUBSCRIPTION_SETTINGS,
  findFormula,
  formulaIncludes,
  newFormula,
  type Formula,
  type SubscriptionSettings,
} from "./subscription-plans";

// Abonnements Swell, prépayés comme le reste de la boutique (PayPal, Wero, virement, mobile money).
//
// 1. Le client achète un pass (1 mois ou 1 an) d'une formule. Quand l'admin valide le paiement, une période
//    d'accès à cette formule est ajoutée à la suite de la précédente de la même formule : renouveler en
//    avance ne fait perdre aucun jour. Une autre formule commence tout de suite (accès cumulés).
// 2. L'essai gratuit est une période comme les autres (kind "trial"), d'une formule choisie dans l'admin,
//    une seule fois par compte et par ordinateur (trial_machine, vérifié à l'activation dans le plugin).
// 3. Le client a une clé par plugin de ses formules (license.viaSubscription). Le plugin reçoit un fichier
//    de licence qui expire à la fin de l'accès le plus lointain parmi les formules qui comprennent ce plugin
//    (+ quelques jours de marge après un pass payé), et le redemande à chaque chargement.

const DAY = 24 * 60 * 60 * 1000;
const SETTINGS_KEY = "subscription";

/** Complète une formule enregistrée (champs ajoutés depuis, valeurs manquantes). */
function normalizeFormula(raw: Partial<Formula> & { id: string }): Formula {
  return { ...newFormula(raw.id, raw.name ?? "Formule"), ...raw };
}

/**
 * Réglages enregistrés. Ceux d'avant les formules (une seule offre : monthCents, excludedProductIds...)
 * deviennent la formule « All Access ».
 */
function parseSettings(json: string): SubscriptionSettings {
  const raw = JSON.parse(json) as Partial<SubscriptionSettings> & Record<string, unknown>;
  let formulas = Array.isArray(raw.formulas) ? raw.formulas.map((f) => normalizeFormula(f)) : null;
  if (!formulas || formulas.length === 0) {
    const legacy = DEFAULT_SUBSCRIPTION_SETTINGS.formulas[0];
    const pick = <K extends keyof Formula>(k: K) => (raw[k] !== undefined ? (raw[k] as Formula[K]) : legacy[k]);
    formulas = [
      {
        ...legacy,
        monthEnabled: pick("monthEnabled"),
        monthCents: pick("monthCents"),
        monthDays: pick("monthDays"),
        monthSaleCents: pick("monthSaleCents"),
        yearEnabled: pick("yearEnabled"),
        yearCents: pick("yearCents"),
        yearDays: pick("yearDays"),
        yearSaleCents: pick("yearSaleCents"),
        excludedProductIds: pick("excludedProductIds"),
      },
    ];
  }
  const settings: SubscriptionSettings = {
    ...DEFAULT_SUBSCRIPTION_SETTINGS,
    enabled: raw.enabled ?? DEFAULT_SUBSCRIPTION_SETTINGS.enabled,
    saleEndsAt: raw.saleEndsAt ?? null,
    trialDays: raw.trialDays ?? DEFAULT_SUBSCRIPTION_SETTINGS.trialDays,
    graceDays: raw.graceDays ?? DEFAULT_SUBSCRIPTION_SETTINGS.graceDays,
    reminderDays: raw.reminderDays ?? DEFAULT_SUBSCRIPTION_SETTINGS.reminderDays,
    trialReminderDays: raw.trialReminderDays ?? DEFAULT_SUBSCRIPTION_SETTINGS.trialReminderDays,
    formulas,
    trialFormulaId: raw.trialFormulaId ?? formulas[0].id,
  };
  if (!formulas.some((f) => f.id === settings.trialFormulaId)) settings.trialFormulaId = formulas[0].id;
  return settings;
}

export async function getSubscriptionSettings(): Promise<SubscriptionSettings> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, SETTINGS_KEY));
  if (!row) return DEFAULT_SUBSCRIPTION_SETTINGS;
  try {
    return parseSettings(row.value);
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
  return end !== null
    ? { ...settings, formulas: settings.formulas.map((f) => ({ ...f, monthSaleCents: null, yearSaleCents: null })) }
    : settings;
}

export async function saveSubscriptionSettings(value: SubscriptionSettings) {
  const json = JSON.stringify(value);
  await db.insert(setting).values({ key: SETTINGS_KEY, value: json }).onConflictDoUpdate({ target: setting.key, set: { value: json } });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Période d'une formule (les périodes d'avant les formules comptent pour la première). */
const formulaOf = (p: { formulaId: string | null }, settings: SubscriptionSettings) => p.formulaId ?? settings.formulas[0]?.id ?? DEFAULT_FORMULA_ID;

/** Ajoute une période d'accès à la suite de la dernière de la même formule (ou à partir de maintenant). */
function addPeriod(
  tx: Tx,
  settings: SubscriptionSettings,
  input: { userId: string; formulaId: string; kind: "trial" | "paid" | "gift"; days: number; orderId?: string; note?: string | null },
) {
  const periods = tx
    .select({ formulaId: subscriptionPeriod.formulaId, endsAt: subscriptionPeriod.endsAt })
    .from(subscriptionPeriod)
    .where(eq(subscriptionPeriod.userId, input.userId))
    .all();
  const lastEnd = Math.max(0, ...periods.filter((p) => formulaOf(p, settings) === input.formulaId).map((p) => p.endsAt.getTime()));
  const start = Math.max(Date.now(), lastEnd);
  tx.insert(subscriptionPeriod)
    .values({
      userId: input.userId,
      formulaId: input.formulaId,
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
    .select({ orderId: shopOrder.id, days: shopOrderItem.subscriptionDays, formula: shopOrderItem.subscriptionFormula })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .leftJoin(subscriptionPeriod, eq(subscriptionPeriod.orderId, shopOrder.id))
    .where(and(eq(shopOrder.userId, userId), eq(shopOrder.status, "paid"), isNotNull(shopOrderItem.subscriptionDays), isNull(subscriptionPeriod.id)))
    .orderBy(asc(shopOrder.paidAt));
  if (missing.length === 0) return;
  const settings = await getSubscriptionSettings();
  db.transaction((tx) => {
    for (const m of missing) {
      addPeriod(tx, settings, { userId, formulaId: m.formula ?? settings.formulas[0].id, kind: "paid", days: m.days!, orderId: m.orderId });
    }
  });
  await ensureSubscriptionLicenses(userId);
}

export type SubscriptionState = "none" | "trial" | "active" | "grace" | "expired";

export const hasAccess = (state: SubscriptionState) => state === "trial" || state === "active" || state === "grace";

const STATE_RANK: Record<SubscriptionState, number> = { active: 4, trial: 3, grace: 2, expired: 1, none: 0 };

export type FormulaAccess = {
  formulaId: string;
  name: string;
  formula: Formula | undefined;
  state: SubscriptionState;
  endsAt: Date;
  accessEndsAt: Date;
};

/** État de l'abonnement d'un client : une ligne par formule qu'il a eue, et un état d'ensemble. */
export async function getSubscription(userId: string) {
  await syncSubscriptionOrders(userId);
  const [settings, periods] = await Promise.all([
    getSubscriptionSettings(),
    db.select().from(subscriptionPeriod).where(eq(subscriptionPeriod.userId, userId)).orderBy(asc(subscriptionPeriod.endsAt)),
  ]);
  const trialUsed = periods.some((p) => p.kind === "trial");
  const hasPaid = periods.some((p) => p.kind !== "trial");
  const now = Date.now();

  const byFormula = new Map<string, typeof periods>();
  for (const p of periods) {
    const id = formulaOf(p, settings);
    byFormula.set(id, [...(byFormula.get(id) ?? []), p]);
  }
  const formulas: FormulaAccess[] = [...byFormula.entries()].map(([formulaId, list]) => {
    const last = list[list.length - 1];
    const formula = findFormula(settings, formulaId);
    // Marge après un pass payé (le temps de valider un renouvellement à la main). Pas de marge après l'essai.
    const accessEndsAt = last.kind === "trial" ? last.endsAt : new Date(last.endsAt.getTime() + settings.graceDays * DAY);
    const current = list.find((p) => p.startsAt.getTime() <= now && now < p.endsAt.getTime());
    const state: SubscriptionState =
      now < last.endsAt.getTime() ? (current?.kind === "trial" && !hasPaid ? "trial" : "active") : now < accessEndsAt.getTime() ? "grace" : "expired";
    return { formulaId, name: formula?.name ?? "Ancienne formule", formula, state, endsAt: last.endsAt, accessEndsAt };
  });
  formulas.sort((a, b) => STATE_RANK[b.state] - STATE_RANK[a.state] || b.endsAt.getTime() - a.endsAt.getTime());

  const state: SubscriptionState = formulas[0]?.state ?? "none";
  return { state, formulas, trialUsed, hasPaid, periods, settings };
}

/** Vrai si une formule en cours (essai, actif ou marge) de ce client comprend ce plugin. */
export async function hasProductAccess(userId: string, productId: string) {
  const window = await subscriptionLicenseWindow(userId, productId);
  return !!window && window.endsAt.getTime() > Date.now();
}

/**
 * Fin de l'accès à ce plugin par l'abonnement (la plus lointaine parmi les formules qui le comprennent),
 * et si le client n'a jamais eu que l'essai. Null si aucune de ses formules ne comprend ce plugin.
 */
export async function subscriptionLicenseWindow(userId: string, productId: string) {
  const sub = await getSubscription(userId);
  const covering = sub.formulas.filter((f) => f.formula && formulaIncludes(f.formula, productId));
  if (covering.length === 0) return null;
  const endsAt = new Date(Math.max(...covering.map((f) => f.accessEndsAt.getTime())));
  return { endsAt, trialOnly: !sub.hasPaid };
}

/** Tous les VST publiés et disponibles (plugins que les formules peuvent comprendre). */
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
 * Une clé par plugin des formules que ce client a eues. Les plugins achetés gardent leur clé définitive ;
 * une clé de démo passe sur l'abonnement.
 */
export async function ensureSubscriptionLicenses(userId: string) {
  const periods = await db.select({ formulaId: subscriptionPeriod.formulaId }).from(subscriptionPeriod).where(eq(subscriptionPeriod.userId, userId));
  if (periods.length === 0) return;
  const settings = await getSubscriptionSettings();
  const formulas = [...new Set(periods.map((p) => formulaOf(p, settings)))].flatMap((id) => findFormula(settings, id) ?? []);
  const plugins = (await getVstPlugins()).filter((p) => formulas.some((f) => formulaIncludes(f, p.id)));
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

/** Lance l'essai gratuit (une seule fois par compte), sur la formule choisie dans l'admin. */
export async function startSubscriptionTrial(userId: string): Promise<{ ok: true; endsAt: Date; formula: Formula } | { error: string }> {
  const settings = await getSubscriptionSettings();
  const formula = findFormula(settings, settings.trialFormulaId);
  if (!settings.enabled || settings.trialDays <= 0 || !formula) return { error: "L'essai gratuit n'est pas ouvert pour le moment." };
  const sub = await getSubscription(userId);
  if (sub.trialUsed) return { error: "Tu as déjà profité de l'essai gratuit." };
  if (sub.periods.length > 0) return { error: "Tu as déjà un abonnement : l'essai est réservé aux nouveaux abonnés." };
  db.transaction((tx) => addPeriod(tx, settings, { userId, formulaId: formula.id, kind: "trial", days: settings.trialDays }));
  await ensureSubscriptionLicenses(userId);
  return { ok: true, endsAt: new Date(Date.now() + settings.trialDays * DAY), formula };
}

/** L'admin offre des jours d'accès à une formule. */
export async function giftSubscriptionDays(userId: string, formulaId: string, days: number, note: string | null) {
  const settings = await getSubscriptionSettings();
  db.transaction((tx) => addPeriod(tx, settings, { userId, formulaId, kind: "gift", days, note }));
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

/** Abonnés pour l'admin : une ligne par client et par formule. */
export async function getAdminSubscribers() {
  const settings = await getSubscriptionSettings();
  const rows = await db
    .select({ period: subscriptionPeriod, name: user.name, email: user.email })
    .from(subscriptionPeriod)
    .innerJoin(user, eq(subscriptionPeriod.userId, user.id))
    .orderBy(asc(subscriptionPeriod.endsAt));
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.period.userId}:${formulaOf(r.period, settings)}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const now = Date.now();
  const paidUsers = new Set(rows.filter((r) => r.period.kind !== "trial").map((r) => r.period.userId));
  const trialUsers = new Set(rows.filter((r) => r.period.kind === "trial").map((r) => r.period.userId));
  return [...groups.values()]
    .map((list) => {
      const last = list[list.length - 1];
      const formulaId = formulaOf(last.period, settings);
      const endsAt = last.period.endsAt;
      const accessEndsAt = last.period.kind === "trial" ? endsAt.getTime() : endsAt.getTime() + settings.graceDays * DAY;
      const hasPaid = list.some((r) => r.period.kind !== "trial");
      const state: SubscriptionState = now < endsAt.getTime() ? (hasPaid ? "active" : "trial") : now < accessEndsAt ? "grace" : "expired";
      return {
        userId: last.period.userId,
        name: last.name,
        email: last.email,
        formulaId,
        formulaName: findFormula(settings, formulaId)?.name ?? "Ancienne formule",
        endsAt,
        since: list[0].period.startsAt,
        paid: list.filter((r) => r.period.kind === "paid").length,
        gifts: list.filter((r) => r.period.kind === "gift").length,
        state,
        trial: trialUsers.has(last.period.userId),
        convertedFromTrial: trialUsers.has(last.period.userId) && paidUsers.has(last.period.userId),
      };
    })
    .sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());
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
