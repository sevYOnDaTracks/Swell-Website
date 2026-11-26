import type { ProductType } from "@/db/schema";

// Utilisable côté serveur et côté client.

export const productTypeLabels: Record<ProductType, string> = {
  vst: "VST",
  drumkit: "Drum kit",
  samplepack: "Sample pack",
  preset: "Presets",
  instrumental: "Instrumentale",
};

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number) {
  return cents === 0 ? "Gratuit" : euros.format(cents / 100);
}

type Priced = { priceCents: number; salePriceCents?: number | null; saleEndsAt?: Date | null; id?: string; type?: string };

/**
 * Promo de masse (Admin → Boutique) : une remise appliquée d'un coup à tous les produits, à des types
 * ou à une sélection, entre deux dates. Elle ne touche pas aux prix promo produit par produit :
 * quand les deux existent, le prix le plus bas l'emporte.
 */
export type MassSale = {
  enabled: boolean;
  // Nom affiché à côté du prix (« Black Friday »), facultatif.
  label: string;
  kind: "percent" | "amount";
  // Pourcentage (1 à 90) ou montant en centimes.
  value: number;
  // Prix rond : arrondi au ,49 ou ,99 juste en dessous (3,49 € reste 3,49 € ; 10,63 € → 10,49 € ; 10,40 € → 9,99 €).
  roundTo99: boolean;
  scope: "all" | "types" | "products";
  types: string[];
  productIds: string[];
  excludeIds: string[];
  startsAt: string | null;
  endsAt: string | null;
};

export const DEFAULT_MASS_SALE: MassSale = {
  enabled: false,
  label: "",
  kind: "percent",
  value: 20,
  roundTo99: true,
  scope: "all",
  types: [],
  productIds: [],
  excludeIds: [],
  startsAt: null,
  endsAt: null,
};

/** Vrai si la promo de masse court à cet instant (activée, commencée, pas finie). */
export function massSaleRunning(m: MassSale | null | undefined, now = Date.now()): m is MassSale {
  return !!m && m.enabled && m.value > 0 && (!m.startsAt || new Date(m.startsAt).getTime() <= now) && (!m.endsAt || new Date(m.endsAt).getTime() > now);
}

/** Vrai si ce produit est concerné par la promo de masse (quelles que soient ses dates). */
export const massSaleApplies = (m: MassSale, p: { id?: string; type?: string; priceCents: number }) =>
  p.priceCents > 0 &&
  !!p.id &&
  !m.excludeIds.includes(p.id) &&
  (m.scope === "all" || (m.scope === "types" && !!p.type && m.types.includes(p.type)) || (m.scope === "products" && m.productIds.includes(p.id)));

/** Prix de ce produit avec la promo de masse (sans regarder les dates), ou null s'il n'est pas concerné. */
export function massSalePrice(m: MassSale, p: { id?: string; type?: string; priceCents: number }) {
  if (!massSaleApplies(m, p)) return null;
  let cents = m.kind === "percent" ? Math.round(p.priceCents * (1 - m.value / 100)) : p.priceCents - m.value;
  // Jamais plus de 50 centimes de remise en plus.
  if (m.roundTo99) cents = Math.floor((cents + 1) / 50) * 50 - 1;
  return cents > 0 && cents < p.priceCents ? cents : null;
}

/** Vrai si le prix barré du produit est en cours (prix promo plus bas que le prix normal, pas encore terminé). */
export function isOnSale(p: Priced, now = Date.now()) {
  return p.salePriceCents != null && p.salePriceCents > 0 && p.salePriceCents < p.priceCents && (!p.saleEndsAt || p.saleEndsAt.getTime() > now);
}

/**
 * Prix payé aujourd'hui. priceCents devient le prix réel (promo comprise) et compareAtCents le prix barré.
 * Appliqué partout où un client voit ou paie un prix : catalogue, panier, commande.
 * Prix promo du produit et promo de masse : le plus bas des deux.
 */
export function withSalePrice<T extends Priced>(p: T, now = Date.now(), mass?: MassSale | null) {
  const own = isOnSale(p, now) ? { cents: p.salePriceCents!, endsAt: p.saleEndsAt ?? null, label: null as string | null } : null;
  const massCents = massSaleRunning(mass, now) ? massSalePrice(mass, p) : null;
  const fromMass = massCents !== null ? { cents: massCents, endsAt: mass!.endsAt ? new Date(mass!.endsAt) : null, label: mass!.label.trim() || null } : null;
  const best = own && fromMass ? (fromMass.cents < own.cents ? fromMass : own) : (own ?? fromMass);
  return {
    ...p,
    priceCents: best ? best.cents : p.priceCents,
    compareAtCents: best ? p.priceCents : null,
    saleEndsAt: best ? best.endsAt : null,
    saleLabel: best ? best.label : null,
  };
}

/** Remise affichée sur un prix barré : « -20 % ». */
export const saleBadge = (priceCents: number, compareAtCents: number) => `-${Math.round((1 - priceCents / compareAtCents) * 100)} %`;

export const mediaUrl = (file: string) => `/media/${file}`;

export const MAX_GALLERY_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Identifiant de la vidéo à partir d'un lien YouTube (watch, youtu.be, shorts, embed, live), sinon null. */
export function youtubeId(link: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`);
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    const [first, second] = url.pathname.split("/").filter(Boolean);
    let id: string | null | undefined;
    if (host === "youtu.be") id = first;
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = first === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live", "v"].includes(first) ? second : null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const sortOptions = [
  { value: "recent", label: "Nouveautés" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
] as const;

export const PLATFORMS = [
  { value: "windows", label: "Windows", short: "Win" },
  { value: "mac", label: "macOS", short: "Mac" },
] as const;

export const PLUGIN_FORMATS = [
  { value: "vst3", label: "VST3" },
  { value: "au", label: "AU", hint: "Logic, GarageBand" },
  { value: "aax", label: "AAX", hint: "Pro Tools" },
  { value: "standalone", label: "Standalone" },
] as const;

/** Les cases de compatibilité ne concernent que les plugins. */
export const hasCompatibility = (type: string) => type === "vst";

/** Les instrumentales ont leur propre page (/instrumentales), avec tempo et tonalité. */
export const isInstrumental = (type: string) => type === "instrumental";

export const platformLabel = (v: string) => PLATFORMS.find((p) => p.value === v)?.label ?? v;

/** « Mac uniquement » / « Windows uniquement » quand un produit ne tourne que sur une plateforme, sinon null. */
export function singlePlatformLabel(platforms: readonly string[] | undefined): string | null {
  const known = PLATFORMS.filter((p) => platforms?.includes(p.value));
  return known.length === 1 ? `${known[0].short} uniquement` : null;
}
export const formatLabel = (v: string) => PLUGIN_FORMATS.find((f) => f.value === v)?.label ?? v;

export const priceOptions = [
  { value: "", label: "Prix" },
  { value: "0", label: "Gratuit" },
  { value: "20", label: "Moins de 20 €" },
  { value: "50", label: "Moins de 50 €" },
  { value: "100", label: "Moins de 100 €" },
] as const;

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0).replace(".", ",")} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2).replace(".", ",")} Go`;
}

/** Format affiché du fichier livré ("ZIP", "DMG"...). */
export const fileFormat = (name: string) => name.split(".").pop()?.toUpperCase() ?? "";

/** Adresse de la fiche d'un produit sur son site : instrumentales sur mix, le reste dans la boutique. */
export const productPath = (p: { slug: string; type: string }) =>
  isInstrumental(p.type) ? `/instrumentales/${p.slug}` : `/boutique/${p.slug}`;
