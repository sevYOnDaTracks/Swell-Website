// Indicatifs proposés dans le profil. Le numéro est enregistré sous la forme
// "+33 612345678" : indicatif, espace, numéro national. "trunk" : pays où le 0 de
// tête du numéro national disparaît après l'indicatif (06… → +33 6…) ; ailleurs
// (Côte d'Ivoire, Congo…) le 0 fait partie du numéro et on le garde.
export const COUNTRY_CODES = [
  { code: "+33", country: "France", flag: "🇫🇷", trunk: true },
  { code: "+32", country: "Belgique", flag: "🇧🇪", trunk: true },
  { code: "+41", country: "Suisse", flag: "🇨🇭", trunk: true },
  { code: "+352", country: "Luxembourg", flag: "🇱🇺" },
  { code: "+1", country: "Canada / États-Unis", flag: "🇨🇦" },
  { code: "+44", country: "Royaume-Uni", flag: "🇬🇧", trunk: true },
  { code: "+49", country: "Allemagne", flag: "🇩🇪", trunk: true },
  { code: "+34", country: "Espagne", flag: "🇪🇸" },
  { code: "+39", country: "Italie", flag: "🇮🇹" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+31", country: "Pays-Bas", flag: "🇳🇱", trunk: true },
  { code: "+225", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+237", country: "Cameroun", flag: "🇨🇲" },
  { code: "+221", country: "Sénégal", flag: "🇸🇳" },
  { code: "+223", country: "Mali", flag: "🇲🇱" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+228", country: "Togo", flag: "🇹🇬" },
  { code: "+229", country: "Bénin", flag: "🇧🇯" },
  { code: "+241", country: "Gabon", flag: "🇬🇦" },
  { code: "+242", country: "Congo", flag: "🇨🇬" },
  { code: "+243", country: "RD Congo", flag: "🇨🇩", trunk: true },
  { code: "+212", country: "Maroc", flag: "🇲🇦", trunk: true },
  { code: "+213", country: "Algérie", flag: "🇩🇿", trunk: true },
  { code: "+216", country: "Tunisie", flag: "🇹🇳" },
  { code: "+590", country: "Guadeloupe", flag: "🇬🇵", trunk: true },
  { code: "+596", country: "Martinique", flag: "🇲🇶", trunk: true },
  { code: "+594", country: "Guyane", flag: "🇬🇫", trunk: true },
  { code: "+262", country: "La Réunion", flag: "🇷🇪", trunk: true },
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
