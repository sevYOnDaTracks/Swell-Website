import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getPublishedProducts } from "@/lib/shop";
import { isInstrumental } from "@/lib/shop-format";
import { isMixHost, MIX_URL, SHOP_URL } from "@/lib/sites";

// Plan du site pour Google, un par adresse : la boutique sur swell-audio.fr,
// les instrumentales sur mix.swell-audio.fr. Les fiches viennent du catalogue publié.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mix = isMixHost((await headers()).get("host"));
  const products = (await getPublishedProducts()).filter((p) => isInstrumental(p.type) === mix);

  if (mix) {
    return [
      { url: `${MIX_URL}/`, changeFrequency: "weekly", priority: 1 },
      { url: `${MIX_URL}/instrumentales`, changeFrequency: "weekly", priority: 0.8 },
      ...products.map((p) => ({ url: `${MIX_URL}/instrumentales/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
    ];
  }
  return [
    { url: `${SHOP_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SHOP_URL}/boutique`, changeFrequency: "daily", priority: 0.9 },
    ...products.map((p) => ({ url: `${SHOP_URL}/boutique/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
    { url: `${SHOP_URL}/boutique/aide`, priority: 0.5 },
    { url: `${SHOP_URL}/cgv`, priority: 0.2 },
    { url: `${SHOP_URL}/mentions-legales`, priority: 0.2 },
    { url: `${SHOP_URL}/confidentialite`, priority: 0.2 },
  ];
}
