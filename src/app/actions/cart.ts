"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { getPaymentOptions as readPaymentOptions } from "@/lib/orders";
import { withSalePrice } from "@/lib/shop-format";

/** Produits du panier, relus en base : prix à jour, produits dépubliés écartés. */
export async function getCartProducts(ids: string[]) {
  const wanted = ids.filter((id) => typeof id === "string").slice(0, 50);
  if (wanted.length === 0) return [];
  const rows = await db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      type: product.type,
      priceCents: product.priceCents,
      salePriceCents: product.salePriceCents,
      saleEndsAt: product.saleEndsAt,
      coverFile: product.coverFile,
      shortDescription: product.shortDescription,
    })
    .from(product)
    .where(and(inArray(product.id, wanted), eq(product.published, true)));
  // Prix barrés en cours : le panier montre le prix promo et l'ancien prix.
  const now = Date.now();
  return rows.map((p) => withSalePrice(p, now));
}

/** Moyens de paiement ouverts (réglés sur le serveur), pour le panneau du panier. */
export async function getPaymentOptions() {
  return readPaymentOptions();
}
