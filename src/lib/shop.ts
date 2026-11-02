import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { product, productTypes, type ProductType } from "@/db/schema";

// Le catalogue public est mis en cache et invalidé par updateTag(PRODUCTS_TAG)
// à chaque modification depuis l'admin.
export const PRODUCTS_TAG = "products";

export type ShopFilters = {
  q?: string;
  type?: ProductType;
  genre?: string;
  max?: number;
  platform?: "windows" | "mac";
  sort?: "recent" | "price-asc" | "price-desc";
};

async function getPublishedProducts() {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("max");
  return db.select().from(product).where(eq(product.published, true)).orderBy(desc(product.createdAt));
}

export async function getShopProducts(filters: ShopFilters) {
  const all = await getPublishedProducts();
  const q = filters.q?.trim().toLowerCase();

  const items = all.filter(
    (p) =>
      (!filters.type || p.type === filters.type) &&
      (!filters.genre || p.genres.includes(filters.genre)) &&
      (filters.max === undefined || p.priceCents <= filters.max * 100) &&
      (!filters.platform || p.platforms.includes(filters.platform)) &&
      (!q || `${p.name} ${p.shortDescription} ${p.genres.join(" ")}`.toLowerCase().includes(q)),
  );

  if (filters.sort === "price-asc") items.sort((a, b) => a.priceCents - b.priceCents);
  if (filters.sort === "price-desc") items.sort((a, b) => b.priceCents - a.priceCents);

  const genres = [...new Set(all.flatMap((p) => p.genres))].sort((a, b) => a.localeCompare(b, "fr"));
  const types = productTypes.filter((t) => all.some((p) => p.type === t));
  const hasPlatforms = all.some((p) => p.platforms.length > 0);
  return { items, genres, types, hasPlatforms, total: all.length };
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("max");
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.slug, slug), eq(product.published, true)));
  return row ?? null;
}

/** Produits mis en avant sur la page d'accueil (à défaut, les plus récents). */
export async function getFeaturedProducts(limit = 3) {
  const all = await getPublishedProducts();
  return [...all.filter((p) => p.featured), ...all.filter((p) => !p.featured)].slice(0, limit);
}

export function parseFilters(params: Record<string, string | string[] | undefined>): ShopFilters {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const type = get("type");
  const max = get("max");
  const sort = get("sort");
  const platform = get("platform");
  return {
    q: get("q"),
    type: productTypes.includes(type as ProductType) ? (type as ProductType) : undefined,
    genre: get("genre"),
    max: max !== undefined && /^\d+$/.test(max) ? Number(max) : undefined,
    platform: platform === "windows" || platform === "mac" ? platform : undefined,
    sort: sort === "price-asc" || sort === "price-desc" ? sort : "recent",
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
