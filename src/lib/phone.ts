// Indicatifs proposés dans le profil. Le numéro est enregistré sous la forme
// "+33 612345678" : indicatif, espace, numéro national. "trunk" : pays où le 0 de
// tête du numéro national disparaît après l'indicatif (06… → +33 6…) ; ailleurs
// (Côte d'Ivoire, Congo…) le 0 fait partie du numéro et on le garde.
export const COUNTRY_CODES = [
  { code: "+33", country: "France", trunk: true },
  { code: "+32", country: "Belgique", trunk: true },
  { code: "+41", country: "Suisse", trunk: true },
  { code: "+352", country: "Luxembourg" },
  { code: "+1", country: "Canada / États-Unis" },
  { code: "+44", country: "Royaume-Uni", trunk: true },
  { code: "+49", country: "Allemagne", trunk: true },
  { code: "+34", country: "Espagne" },
  { code: "+39", country: "Italie" },
  { code: "+351", country: "Portugal" },
  { code: "+31", country: "Pays-Bas", trunk: true },
  { code: "+225", country: "Côte d'Ivoire" },
  { code: "+237", country: "Cameroun" },
  { code: "+221", country: "Sénégal" },
  { code: "+223", country: "Mali" },
  { code: "+226", country: "Burkina Faso" },
  { code: "+228", country: "Togo" },
  { code: "+229", country: "Bénin" },
  { code: "+241", country: "Gabon" },
  { code: "+242", country: "Congo" },
  { code: "+243", country: "RD Congo", trunk: true },
  { code: "+212", country: "Maroc", trunk: true },
  { code: "+213", country: "Algérie", trunk: true },
  { code: "+216", country: "Tunisie" },
  { code: "+590", country: "Guadeloupe", trunk: true },
  { code: "+596", country: "Martinique", trunk: true },
  { code: "+594", country: "Guyane", trunk: true },
  { code: "+262", country: "La Réunion", trunk: true },
] as const;

export const DEFAULT_COUNTRY_CODE = "+33";

/** Numéro national nettoyé : chiffres seuls, sans le 0 de tête dans les pays où il saute. */
export function normalizeNumber(code: string, raw: string) {
  const digits = raw.replace(/[\s.\-()]/g, "");
  const country = COUNTRY_CODES.find((c) => c.code === code);
  return country && "trunk" in country ? digits.replace(/^0/, "") : digits;
}

/** Sépare "+33 612345678" en indicatif et numéro, pour pré-remplir le formulaire. */
export function splitPhone(phone: string | null | undefined) {
  const match = phone?.match(/^(\+\d{1,4}) (\d+)$/);
  return match ? { code: match[1], number: match[2] } : { code: DEFAULT_COUNTRY_CODE, number: "" };
}

/** Numéro lisible : "+33 6 12 34 56 78". */
export function formatPhone(phone: string | null | undefined) {
  const parts = splitPhone(phone);
  if (!parts.number) return "";
  const n = parts.number;
  const grouped = n.length % 2 ? `${n[0]} ${n.slice(1).replace(/(\d{2})(?=\d)/g, "$1 ")}` : n.replace(/(\d{2})(?=\d)/g, "$1 ");
  return `${parts.code} ${grouped}`;
}

/** Lien tel: pour appeler depuis un téléphone. */
export function phoneHref(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}
