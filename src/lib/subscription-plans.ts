// Formules de l'abonnement Swell All Access (sans dépendance serveur : lu aussi dans le navigateur).
// Tout se règle depuis /admin/abonnements et se garde dans la table setting (clé "subscription").

export type SubscriptionSettings = {
  // Fermé : la page /abonnement annonce l'abonnement sans permettre de s'abonner.
  enabled: boolean;
  monthEnabled: boolean;
  monthCents: number;
  monthDays: number;
  yearEnabled: boolean;
  yearCents: number;
  yearDays: number;
  // Prix barrés des pass (vide = pas de promo), jusqu'à saleEndsAt (ISO, vide = sans fin).
  monthSaleCents: number | null;
  yearSaleCents: number | null;
  saleEndsAt: string | null;
  // Essai gratuit de toute la gamme (0 = pas d'essai).
  trialDays: number;
  // Jours de marge après la fin d'un pass payé, le temps de valider un renouvellement.
  graceDays: number;
  // Rappels par email : jours avant la fin d'un pass, et avant la fin de l'essai.
  reminderDays: number;
  trialReminderDays: number;
  // Plugins (VST publiés) retirés de l'abonnement. Les nouveaux plugins y entrent d'office.
  excludedProductIds: string[];
};

export const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettings = {
  enabled: false,
  monthEnabled: true,
  monthCents: 799,
  monthDays: 30,
  yearEnabled: true,
  yearCents: 6900,
  yearDays: 365,
  monthSaleCents: null,
  yearSaleCents: null,
  saleEndsAt: null,
  trialDays: 14,
  graceDays: 3,
  reminderDays: 7,
  trialReminderDays: 3,
  excludedProductIds: [],
};

export const SUBSCRIPTION_NAME = "Swell All Access";

export const PLANS = {
  month: { label: "1 mois", short: "mois" },
  year: { label: "1 an", short: "an" },
} as const;

export type Plan = keyof typeof PLANS;

export const isPlan = (v: string): v is Plan => v === "month" || v === "year";

export const planEnabled = (s: SubscriptionSettings, plan: Plan) => (plan === "year" ? s.yearEnabled : s.monthEnabled);

export const enabledPlans = (s: SubscriptionSettings) => (Object.keys(PLANS) as Plan[]).filter((p) => planEnabled(s, p));

export const planDays = (s: SubscriptionSettings, plan: Plan) => (plan === "year" ? s.yearDays : s.monthDays);

/** Prix normal du pass (avant prix barré). */
export const planRegularPrice = (s: SubscriptionSettings, plan: Plan) => (plan === "year" ? s.yearCents : s.monthCents);

/**
 * Vrai si la promo des pass court encore. Sans `now`, la date n'est pas vérifiée : les réglages publics
 * (getPublicSubscriptionSettings) ont déjà retiré une promo terminée, et une page prérendue ne lit pas l'heure.
 * Les actions qui encaissent passent toujours `now`.
 */
export const plansSaleRunning = (s: SubscriptionSettings, now?: number) => now === undefined || !s.saleEndsAt || new Date(s.saleEndsAt).getTime() > now;

/** Prix barré en cours pour ce pass, sinon null. */
export function planSalePrice(s: SubscriptionSettings, plan: Plan, now?: number) {
  const sale = plan === "year" ? s.yearSaleCents : s.monthSaleCents;
  return sale && sale > 0 && sale < planRegularPrice(s, plan) && plansSaleRunning(s, now) ? sale : null;
}

/** Prix payé aujourd'hui pour ce pass (promo comprise). */
export const planPrice = (s: SubscriptionSettings, plan: Plan, now?: number) => planSalePrice(s, plan, now) ?? planRegularPrice(s, plan);

/** Prix mensuel le plus bas parmi les formules ouvertes (« dès X € par mois »). */
export function lowestMonthlyCents(s: SubscriptionSettings) {
  const prices = enabledPlans(s).map((p) => Math.round((planPrice(s, p) * 30) / planDays(s, p)));
  return prices.length ? Math.min(...prices) : null;
}

/** Économie de la formule annuelle par rapport au mensuel sur la même durée, en % (0 si aucune). */
export function yearlySaving(s: SubscriptionSettings) {
  if (!s.monthEnabled || !s.yearEnabled) return 0;
  const monthly = (planPrice(s, "month") / s.monthDays) * s.yearDays;
  return Math.max(0, Math.round((1 - planPrice(s, "year") / monthly) * 100));
}

export const SUBSCRIPTION_STATE_LABELS = {
  none: "Pas d'abonnement",
  trial: "Essai gratuit",
  active: "Actif",
  grace: "À renouveler",
  expired: "Terminé",
} as const;
