import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { product, productTypes, type ProductType } from "@/db/schema";
import { getMassSale } from "./mass-sale";
import { isOnSale, withSalePrice } from "./shop-format";

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

/**
 * Prix barrés (produit par produit et promo de masse) appliqués au catalogue mis en cache.
 * Le cache expire au prochain changement (fin d'une promo, début ou fin de la promo de masse) :
 * les prix changent tout seuls, sans action dans l'admin.
 */
async function applySales<T extends Parameters<typeof withSalePrice>[0]>(rows: T[]) {
  const mass = await getMassSale();
  const now = Date.now();
  const changes = rows.flatMap((p) => (isOnSale(p, now) && p.saleEndsAt ? [p.saleEndsAt.getTime()] : []));
  if (mass.enabled) {
    for (const d of [mass.startsAt, mass.endsAt]) if (d && new Date(d).getTime() > now) changes.push(new Date(d).getTime());
  }
  if (changes.length > 0) {
    const seconds = Math.max(60, Math.ceil((Math.min(...changes) - now) / 1000));
    cacheLife({ stale: 30, revalidate: seconds, expire: seconds + 60 });
  } else {
    cacheLife("max");
  }
  return rows.map((p) => withSalePrice(p, now, mass));
}

export async function getPublishedProducts() {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  return applySales(await db.select().from(product).where(eq(product.published, true)).orderBy(desc(product.createdAt)));
}

export async function getShopProducts(filters: ShopFilters) {
  const all = (await getPublishedProducts()).filter((p) => p.type !== "instrumental");
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
  const rows = await db
    .select()
    .from(product)
    .where(and(eq(product.slug, slug), eq(product.published, true)));
  return (await applySales(rows))[0] ?? null;
}

/** Instrumentales publiées (page /instrumentales), filtrables par recherche et tag. */
export async function getInstrumentals(filters: { q?: string; genre?: string }) {
  const all = (await getPublishedProducts()).filter((p) => p.type === "instrumental");
  const q = filters.q?.trim().toLowerCase();
  const items = all.filter(
    (p) =>
      (!filters.genre || p.genres.includes(filters.genre)) &&
      (!q || `${p.name} ${p.shortDescription} ${p.genres.join(" ")} ${p.musicalKey ?? ""}`.toLowerCase().includes(q)),
  );
  const genres = [...new Set(all.flatMap((p) => p.genres))].sort((a, b) => a.localeCompare(b, "fr"));
  return { items, genres, total: all.length };
}

/** VST publiés et disponibles, dans l'ordre du catalogue (plugins que les formules d'abonnement peuvent comprendre). */
export async function getSubscribablePlugins() {
  return (await getPublishedProducts()).filter((p) => p.type === "vst" && p.downloadFile);
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
