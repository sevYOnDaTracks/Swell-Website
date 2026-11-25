import type { Metadata } from "next";
import { isInstrumental, mediaUrl } from "./shop-format";
import { MIX_URL, SHOP_URL } from "./sites";

// Référencement : adresse canonique, aperçu de partage et données structurées.

/** Image montrée quand un lien du site est partagé (public/og.png, 1200 × 630). */
export const SHARE_IMAGE = { url: `${SHOP_URL}/og.png`, width: 1200, height: 630, alt: "Swell" };

/** Balises d'une page publique : titre, description, adresse canonique et aperçu de partage. */
export function pageMeta({ url, title, description, image }: { url: string; title: string; description?: string; image?: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { siteName: "Swell", locale: "fr_FR", type: "website", url, title, description, images: [image ?? SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [image ?? SHARE_IMAGE.url] },
  };
}

type ProductForSeo = {
  slug: string;
  name: string;
  type: string;
  shortDescription: string;
  priceCents: number;
  coverFile: string | null;
};

/** Adresse publique d'une fiche : instrumentales sur mix.swell-audio.fr, le reste sur swell-audio.fr. */
export const productUrl = (p: { slug: string; type: string }) =>
  isInstrumental(p.type) ? `${MIX_URL}/instrumentales/${p.slug}` : `${SHOP_URL}/boutique/${p.slug}`;

/** Fiche produit pour Google (nom, visuel, prix). Les avis s'y rattachent par le même @id. */
export function productJsonLd(p: ProductForSeo) {
  const url = productUrl(p);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    url,
    ...(p.shortDescription ? { description: p.shortDescription } : {}),
    ...(p.coverFile ? { image: `${SHOP_URL}${mediaUrl(p.coverFile)}` } : {}),
    brand: { "@type": "Brand", name: "Swell" },
    offers: {
      "@type": "Offer",
      url,
      price: (p.priceCents / 100).toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };
}

/** Nom et logo du site, pour l'affichage de la marque dans les résultats. */
export function siteJsonLd(mix: boolean) {
  const url = mix ? MIX_URL : SHOP_URL;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${url}/#website`, url: `${url}/`, name: mix ? "Swell Mix" : "Swell", inLanguage: "fr-FR" },
      { "@type": "Organization", "@id": `${SHOP_URL}/#organization`, name: "Swell", url: `${SHOP_URL}/`, logo: `${SHOP_URL}/icon.png` },
    ],
  };
}
