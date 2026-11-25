import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isMixHost, MIX_URL, SHOP_URL } from "@/lib/sites";

// Un robots.txt par adresse (swell-audio.fr et mix.swell-audio.fr), chacun avec son plan du site.
// Les pages de connexion restent ouvertes aux robots : c'est leur balise noindex qui les écarte.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = isMixHost((await headers()).get("host")) ? MIX_URL : SHOP_URL;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/compte", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
