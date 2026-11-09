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
