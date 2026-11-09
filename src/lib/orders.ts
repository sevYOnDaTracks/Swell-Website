import "server-only";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { product, shopOrder, shopOrderItem, user } from "@/db/schema";
import type { PaymentOptions } from "./payments";

/** Coordonnées du virement. Sans IBAN configuré sur le serveur, le paiement par virement reste fermé. */
export function getTransferDetails() {
  const iban = process.env.BANK_TRANSFER_IBAN?.trim();
  const holder = process.env.BANK_TRANSFER_HOLDER?.trim();
  return iban && holder ? { iban, holder } : null;
}

/** Adresse PayPal qui reçoit les paiements. Sans elle, PayPal n'est pas proposé. */
export function getPaypalEmail() {
  return process.env.PAYPAL_EMAIL?.trim() || null;
}

/** Numéros Wave et Orange Money (WAVE_NUMBER, ORANGE_MONEY_NUMBER) et nom affiché (MOBILE_MONEY_NAME). */
export function getMobileMoney() {
  return {
    wave: process.env.WAVE_NUMBER?.trim() || null,
    orange_money: process.env.ORANGE_MONEY_NUMBER?.trim() || null,
    name: process.env.MOBILE_MONEY_NAME?.trim() || null,
  };
}

/** Moyens de paiement ouverts sur le serveur. */
export function getPaymentOptions(): PaymentOptions {
  const mobile = getMobileMoney();
  return { paypal: !!getPaypalEmail(), transfer: !!getTransferDetails(), wave: !!mobile.wave, orange_money: !!mobile.orange_money };
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
      type: product.type,
      slug: product.slug,
      coverFile: product.coverFile,
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
  type Item = typeof shopOrderItem.$inferSelect & { productType: string | null };
  if (orderIds.length === 0) return new Map<string, Item[]>();
  const rows = await db
    .select({ item: shopOrderItem, productType: product.type })
    .from(shopOrderItem)
    .leftJoin(product, eq(shopOrderItem.productId, product.id))
    .where(inArray(shopOrderItem.orderId, orderIds));
  const items: Item[] = rows.map((r) => ({ ...r.item, productType: r.productType }));
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    grouped.set(item.orderId, [...(grouped.get(item.orderId) ?? []), item]);
  }
  return grouped;
}

/** Historique complet des commandes du client, de la plus récente à la plus ancienne. */
export async function getOrderHistory(userId: string) {
  const orders = await db.select().from(shopOrder).where(eq(shopOrder.userId, userId)).orderBy(desc(shopOrder.createdAt));
  const items = await itemsByOrder(orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, items: items.get(o.id) ?? [] }));
}

/** Commandes en attente de paiement du client. */
export async function getPendingOrders(userId: string) {
  const orders = await db
    .select()
    .from(shopOrder)
    .where(and(eq(shopOrder.userId, userId), eq(shopOrder.status, "pending")))
    .orderBy(desc(shopOrder.createdAt));
  const items = await itemsByOrder(orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, items: items.get(o.id) ?? [] }));
}

/** Commandes payantes et cadeaux pour l'admin : les gratuites ne demandent aucune action. */
export async function getAdminOrders() {
  const orders = await db
    .select({
      id: shopOrder.id,
      reference: shopOrder.reference,
      method: shopOrder.method,
      status: shopOrder.status,
      totalCents: shopOrder.totalCents,
      promoCode: shopOrder.promoCode,
      proofSentAt: shopOrder.proofSentAt,
      discountCents: shopOrder.discountCents,
      createdAt: shopOrder.createdAt,
      paidAt: shopOrder.paidAt,
      clientName: user.name,
      clientEmail: user.email,
    })
    .from(shopOrder)
    .innerJoin(user, eq(shopOrder.userId, user.id))
    .where(ne(shopOrder.method, "free"))
    .orderBy(desc(shopOrder.createdAt))
    .limit(100);
  const items = await itemsByOrder(orders.map((o) => o.id));
  return orders.map((o) => ({ ...o, items: items.get(o.id) ?? [] }));
}

/** Une commande du client, retrouvée par sa référence (SW-XXXXXX). Null si elle n'est pas à lui. */
export async function getMyOrder(userId: string, reference: string) {
  const [order] = await db
    .select()
    .from(shopOrder)
    .where(and(eq(shopOrder.userId, userId), eq(shopOrder.reference, reference.toUpperCase())));
  if (!order) return null;
  const items = await db.select().from(shopOrderItem).where(eq(shopOrderItem.orderId, order.id));
  return { ...order, items };
}

/** Les instrumentales se vendent sur mix.swell-audio.fr, le reste sur la boutique : chaque site montre ses commandes. */
export const orderSite = (order: { items: { productType?: string | null }[] }) =>
  order.items.some((i) => i.productType === "instrumental") ? "mix" : "shop";
