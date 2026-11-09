// Listes de l'admin : recherche, filtres et pagination dans l'adresse (?q=&page=&…),
// pour pouvoir partager ou recharger une vue sans la perdre.

export const PAGE_SIZE = 20;

export type ListParams = Record<string, string | string[] | undefined>;

export function readParam(params: ListParams, key: string) {
  const v = params[key];
  return typeof v === "string" ? v.trim() : "";
}

/** Page demandée (1 par défaut) et décalage SQL correspondant. */
export function readPage(params: ListParams) {
  const page = Math.max(1, Number.parseInt(readParam(params, "page"), 10) || 1);
  return { page, offset: (page - 1) * PAGE_SIZE };
}

/** Adresse de la même liste avec quelques paramètres changés (vides retirés). */
export function listHref(basePath: string, params: ListParams, changes: Record<string, string | number | null>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v) next.set(k, v);
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === "" || (k === "page" && Number(v) <= 1)) next.delete(k);
    else next.set(k, String(v));
  }
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
