// Le numéro est enregistré sous la forme "+33 612345678" : indicatif (saisi librement
// par l'utilisateur), espace, numéro national.
export const DEFAULT_COUNTRY_CODE = "+33";

// Pays où le 0 de tête du numéro national disparaît après l'indicatif (06… → +33 6…).
// Ailleurs (Côte d'Ivoire, Congo…) le 0 fait partie du numéro et on le garde.
const TRUNK_ZERO_CODES = new Set(["+33", "+32", "+41", "+44", "+49", "+31", "+243", "+212", "+213", "+590", "+596", "+594", "+262"]);

/** Indicatif nettoyé ("33", "0033", "+ 33" → "+33"), ou null s'il n'est pas valide. */
export function normalizeCode(raw: string) {
  const code = `+${raw.replace(/\s/g, "").replace(/^(\+|00)/, "")}`;
  return /^\+[1-9]\d{0,3}$/.test(code) ? code : null;
}

/** Numéro national nettoyé : chiffres seuls, sans le 0 de tête dans les pays où il saute. */
export function normalizeNumber(code: string, raw: string) {
  const digits = raw.replace(/[\s.\-()]/g, "");
  return TRUNK_ZERO_CODES.has(code) ? digits.replace(/^0/, "") : digits;
}

/** Valide l'indicatif et le numéro saisis. Un numéro vide donne null : le téléphone reste facultatif. */
export function parsePhoneInput(rawCode: string, rawNumber: string): { phone: string | null } | { error: string } {
  const code = normalizeCode(rawCode);
  const digits = code ? normalizeNumber(code, rawNumber) : rawNumber.trim();
  if (!digits) return { phone: null };
  if (!code) return { error: "Indicatif invalide : par exemple +33, +225 ou +1." };
  if (!/^\d{6,14}$/.test(digits)) return { error: "Numéro de téléphone invalide (chiffres uniquement)." };
  return { phone: `${code} ${digits}` };
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
