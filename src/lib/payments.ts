// Moyens de paiement (sans dépendance serveur : lu aussi dans le panier).
// Wero : paiement instantané entre comptes bancaires européens, depuis l'app de la banque ou l'app Wero.
// Mobile money (Côte d'Ivoire) : le client paie sur ton numéro Wave ou Orange Money,
// envoie la capture du paiement, et tu valides la commande depuis l'admin.

export type PayMethod = "paypal" | "wero" | "transfer" | "wave" | "orange_money";
export type MobileMethod = "wave" | "orange_money";

export const isMobileMethod = (m: string): m is MobileMethod => m === "wave" || m === "orange_money";

export const METHOD_LABELS: Record<string, string> = {
  paypal: "PayPal",
  wero: "Wero",
  transfer: "Virement bancaire",
  wave: "Wave",
  orange_money: "Orange Money",
  free: "Aucun (gratuit)",
  gift: "Offert par Swell",
};

/** Ouverture de chaque moyen de paiement (réglée sur le serveur). */
export type PaymentOptions = Record<PayMethod, boolean>;

/** Ordre d'affichage des moyens de paiement. */
export const METHOD_ORDER: PayMethod[] = ["wave", "orange_money", "paypal", "wero", "transfer"];

// Taux fixe euro / franc CFA (BCEAO). Arrondi aux 5 FCFA supérieurs.
export const EUR_TO_XOF = 655.957;
export const toFcfa = (cents: number) => Math.ceil(((cents / 100) * EUR_TO_XOF) / 5) * 5;
export const formatFcfa = (cents: number) => `${new Intl.NumberFormat("fr-FR").format(toFcfa(cents))} FCFA`;
