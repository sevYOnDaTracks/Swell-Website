// Formules d'abonnement Swell (sans dépendance serveur : lu aussi dans le navigateur).
// Tout se règle depuis /admin/abonnements et se garde dans la table setting (clé "subscription").
//
// Chaque formule (ex. « Essentials », « All Access ») a ses pass (1 mois, 1 an), ses prix, ses promos
// et sa liste de plugins. Un abonné a accès aux plugins de toutes les formules qu'il a en cours.

export type Formula = {
  // Identifiant fixé à la création (gardé sur les commandes et les périodes d'accès).
  id: string;
  name: string;
  description: string;
  // Proposée à la vente sur /abonnement (une formule masquée reste valable pour ceux qui l'ont déjà).
  visible: boolean;
  // Mise en avant sur la page (« Le plus choisi »).
  highlighted: boolean;
  monthEnabled: boolean;
  monthCents: number;
  monthDays: number;
  monthSaleCents: number | null;
  yearEnabled: boolean;
  yearCents: number;
  yearDays: number;
  yearSaleCents: number | null;
  // Tous les plugins (les nouveaux entrent d'office), sauf excludedProductIds ;
  // sinon seulement productIds.
  allPlugins: boolean;
  excludedProductIds: string[];
  productIds: string[];
};

export type SubscriptionSettings = {
  // Fermé : la page /abonnement annonce l'abonnement sans permettre de s'abonner.
  enabled: boolean;
  formulas: Formula[];
  // Fin des prix promo des pass, pour toutes les formules (ISO, vide = sans fin).
  saleEndsAt: string | null;
  // Essai gratuit (0 = pas d'essai) : il donne accès à la formule trialFormulaId.
  trialDays: number;
  trialFormulaId: string;
  // Jours de marge après la fin d'un pass payé, le temps de valider un renouvellement.
  graceDays: number;
  // Rappels par email : jours avant la fin d'un pass, et avant la fin de l'essai.
  reminderDays: number;
  trialReminderDays: number;
};

export const DEFAULT_FORMULA_ID = "all-access";

export const newFormula = (id: string, name: string): Formula => ({
  id,
  name,
  description: "",
  visible: true,
  highlighted: false,
  monthEnabled: true,
  monthCents: 799,
  monthDays: 30,
  monthSaleCents: null,
  yearEnabled: true,
  yearCents: 6900,
  yearDays: 365,
  yearSaleCents: null,
  allPlugins: true,
  excludedProductIds: [],
  productIds: [],
});

export const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettings = {
  enabled: false,
  formulas: [{ ...newFormula(DEFAULT_FORMULA_ID, "All Access"), description: "Tous les plugins Swell, nouveautés comprises." }],
  saleEndsAt: null,
  trialDays: 14,
  trialFormulaId: DEFAULT_FORMULA_ID,
  graceDays: 3,
  reminderDays: 7,
  trialReminderDays: 3,
};

export const SUBSCRIPTION_NAME = "Abonnement Swell";

export const PLANS = {
  month: { label: "1 mois", short: "mois" },
  year: { label: "1 an", short: "an" },
} as const;

export type Plan = keyof typeof PLANS;

export const isPlan = (v: string): v is Plan => v === "month" || v === "year";

export const findFormula = (s: SubscriptionSettings, id: string | null | undefined) =>
  s.formulas.find((f) => f.id === id) ?? (id ? undefined : s.formulas[0]);

export const formulaIncludes = (f: Formula, productId: string) =>
  f.allPlugins ? !f.excludedProductIds.includes(productId) : f.productIds.includes(productId);

export const planEnabled = (f: Formula, plan: Plan) => (plan === "year" ? f.yearEnabled : f.monthEnabled);

export const enabledPlans = (f: Formula) => (Object.keys(PLANS) as Plan[]).filter((p) => planEnabled(f, p));

/** Formules proposées à la vente (visibles, avec au moins un pass ouvert). */
export const visibleFormulas = (s: SubscriptionSettings) => s.formulas.filter((f) => f.visible && enabledPlans(f).length > 0);

export const planDays = (f: Formula, plan: Plan) => (plan === "year" ? f.yearDays : f.monthDays);

/** Prix normal du pass (avant prix barré). */
export const planRegularPrice = (f: Formula, plan: Plan) => (plan === "year" ? f.yearCents : f.monthCents);

/**
 * Vrai si la promo des pass court encore. Sans `now`, la date n'est pas vérifiée : les réglages publics
 * (getPublicSubscriptionSettings) ont déjà retiré une promo terminée, et une page prérendue ne lit pas l'heure.
 * Les actions qui encaissent passent toujours `now`.
 */
export const plansSaleRunning = (s: SubscriptionSettings, now?: number) => now === undefined || !s.saleEndsAt || new Date(s.saleEndsAt).getTime() > now;

/** Prix barré en cours pour ce pass, sinon null. */
export function planSalePrice(s: SubscriptionSettings, f: Formula, plan: Plan, now?: number) {
  const sale = plan === "year" ? f.yearSaleCents : f.monthSaleCents;
  return sale && sale > 0 && sale < planRegularPrice(f, plan) && plansSaleRunning(s, now) ? sale : null;
}

/** Prix payé aujourd'hui pour ce pass (promo comprise). */
export const planPrice = (s: SubscriptionSettings, f: Formula, plan: Plan, now?: number) => planSalePrice(s, f, plan, now) ?? planRegularPrice(f, plan);

/**
 * Prix ramené au mois : divisé par le nombre de mois que couvre le pass (365 jours = 12 mois, 30 jours = 1 mois).
 * Un pass annuel à 48 € donne donc 4 € par mois, et non 48 × 30 / 365 = 3,95 €.
 */
export function monthlyEquivalentCents(cents: number, days: number) {
  const months = Math.max(1, Math.round(days / (365 / 12)));
  return Math.round(cents / months);
}

/** Prix mensuel le plus bas d'une formule (« dès X € par mois »). */
export function lowestMonthlyCents(s: SubscriptionSettings, f: Formula) {
  const prices = enabledPlans(f).map((p) => monthlyEquivalentCents(planPrice(s, f, p), planDays(f, p)));
  return prices.length ? Math.min(...prices) : null;
}

/** La formule proposée la moins chère qui comprend ce plugin, avec son prix mensuel. */
export function cheapestFormulaFor(s: SubscriptionSettings, productId: string) {
  const options = visibleFormulas(s)
    .filter((f) => formulaIncludes(f, productId))
    .map((f) => ({ formula: f, monthly: lowestMonthlyCents(s, f) ?? Infinity }))
    .sort((a, b) => a.monthly - b.monthly);
  return options[0] && Number.isFinite(options[0].monthly) ? options[0] : null;
}

/** Économie du pass annuel par rapport au mensuel sur la même durée, en % (0 si aucune). */
export function yearlySaving(s: SubscriptionSettings, f: Formula) {
  if (!f.monthEnabled || !f.yearEnabled) return 0;
  const monthly = (planPrice(s, f, "month") / f.monthDays) * f.yearDays;
  return Math.max(0, Math.round((1 - planPrice(s, f, "year") / monthly) * 100));
}

export const SUBSCRIPTION_STATE_LABELS = {
  none: "Pas d'abonnement",
  trial: "Essai gratuit",
  active: "Actif",
  grace: "À renouveler",
  expired: "Terminé",
} as const;

/** Nom affiché d'un pass sur une commande : « All Access · 1 mois ». */
export const passName = (f: Formula, plan: Plan) => `${f.name} · ${PLANS[plan].label}`;
