"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { getPaypalEmail, getTransferDetails } from "@/lib/orders";

/** Produits du panier, relus en base : prix à jour, produits dépubliés écartés. */
export async function getCartProducts(ids: string[]) {
  const wanted = ids.filter((id) => typeof id === "string").slice(0, 50);
  if (wanted.length === 0) return [];
  return db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      type: product.type,
      priceCents: product.priceCents,
      coverFile: product.coverFile,
      shortDescription: product.shortDescription,
    })
    .from(product)
    .where(and(inArray(product.id, wanted), eq(product.published, true)));
}

/** Moyens de paiement ouverts (réglés sur le serveur), pour le panneau du panier. */
export async function getPaymentOptions() {
  return { transferOpen: !!getTransferDetails(), paypalOpen: !!getPaypalEmail() };
}
