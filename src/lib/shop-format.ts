import type { ProductType } from "@/db/schema";

// Utilisable côté serveur et côté client.

export const productTypeLabels: Record<ProductType, string> = {
  vst: "VST",
  drumkit: "Drum kit",
  samplepack: "Sample pack",
  preset: "Presets",
};

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number) {
  return cents === 0 ? "Gratuit" : euros.format(cents / 100);
}

export const mediaUrl = (file: string) => `/media/${file}`;

export const sortOptions = [
  { value: "recent", label: "Nouveautés" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
] as const;

export const priceOptions = [
  { value: "", label: "Prix" },
  { value: "0", label: "Gratuit" },
  { value: "20", label: "Moins de 20 €" },
  { value: "50", label: "Moins de 50 €" },
  { value: "100", label: "Moins de 100 €" },
] as const;
