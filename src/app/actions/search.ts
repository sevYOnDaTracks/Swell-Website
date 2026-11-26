"use server";

import { getPublishedProducts } from "@/lib/shop";

export type SearchItem = {
  id: string;
  name: string;
  slug: string;
  type: string;
  coverFile: string | null;
  priceCents: number;
  compareAtCents: number | null;
  shortDescription: string;
  genres: string[];
};

/** Catalogue léger pour la recherche de la barre du haut (instrumentales sur mix, le reste sur la boutique). */
export async function getSearchCatalog(site: "shop" | "mix"): Promise<SearchItem[]> {
  const products = await getPublishedProducts();
  return products
    .filter((p) => (site === "mix" ? p.type === "instrumental" : p.type !== "instrumental"))
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      coverFile: p.coverFile,
      priceCents: p.priceCents,
      compareAtCents: p.compareAtCents,
      shortDescription: p.shortDescription,
      genres: p.genres,
    }));
}
