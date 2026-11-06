import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { product, shopOrder, shopOrderItem, user } from "@/db/schema";

/** Coordonnées du virement. Sans IBAN configuré sur le serveur, le paiement par virement reste fermé. */
export function getTransferDetails() {
  const iban = process.env.BANK_TRANSFER_IBAN?.trim();
  const holder = process.env.BANK_TRANSFER_HOLDER?.trim();
  return iban && holder ? { iban, holder } : null;
}

// Sans O, 0, I ni 1 : la référence se recopie sans erreur dans un libellé de virement.
const REFERENCE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newOrderReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `SW-${Array.from(bytes, (b) => REFERENCE_LETTERS[b % REFERENCE_LETTERS.length]).join("")}`;
}

/** Vrai si ce client a une commande payée contenant ce produit. */
export async function hasPurchased(userId: string, productId: string) {
  const [row] = await db
    .select({ id: shopOrderItem.id })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .where(and(eq(shopOrder.userId, userId), eq(shopOrder.status, "paid"), eq(shopOrderItem.productId, productId)))
    .limit(1);
  return !!row;
}

/** Produits téléchargeables par ce client (un seul exemplaire par produit). */
export async function getPurchases(userId: string) {
  const rows = await db
    .select({
      itemId: shopOrderItem.id,
      productId: shopOrderItem.productId,
      name: shopOrderItem.name,
      paidAt: shopOrder.paidAt,
      available: product.downloadFile,
      downloadSize: product.downloadSize,
    })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .leftJoin(product, eq(shopOrderItem.productId, product.id))
    .where(and(eq(shopOrder.userId, userId), eq(shopOrder.status, "paid")))
    .orderBy(desc(shopOrder.paidAt));

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.productId ?? row.itemId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function itemsByOrder(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, (typeof shopOrderItem.$inferSelect)[]>();
  const items = await db.select().from(shopOrderItem).where(inArray(shopOrderItem.orderId, orderIds));
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    grouped.set(item.orderId, [...(grouped.get(item.orderId) ?? []), item]);
  }
  return grouped;
}

/** Commandes en attente de virement du client. */
export async function getPendingOrders(userId: string) {
  const orders = await db
    .select()
    .from(shopOrder)
    .where(and(eq(shopOrder.userId, userId), eq(shopOrder.status, "pending")))
    .orderBy(desc(shopOrder.createdAt));
  const items = await itemsByOrder(orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, items: items.get(o.id) ?? [] }));
}

/** Commandes payantes pour l'admin : les gratuites ne demandent aucune action. */
export async function getAdminOrders() {
  const orders = await db
    .select({
      id: shopOrder.id,
      reference: shopOrder.reference,
      status: shopOrder.status,
      totalCents: shopOrder.totalCents,
      createdAt: shopOrder.createdAt,
      paidAt: shopOrder.paidAt,
      clientName: user.name,
      clientEmail: user.email,
    })
    .from(shopOrder)
    .innerJoin(user, eq(shopOrder.userId, user.id))
    .where(eq(shopOrder.method, "transfer"))
    .orderBy(desc(shopOrder.createdAt))
    .limit(100);
  const items = await itemsByOrder(orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, items: items.get(o.id) ?? [] }));
}
