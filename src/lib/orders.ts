import "server-only";
import { and, count, desc, eq, exists, inArray, isNotNull, like as sqlLike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderMethods, product, shopOrder, shopOrderItem, user } from "@/db/schema";
import { formatFcfa, isMobileMethod, METHOD_LABELS, type PaymentOptions } from "./payments";
import { formatPrice } from "./shop-format";

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

/** Numéro (ou adresse email) Wero qui reçoit les paiements (WERO_NUMBER), et nom affiché (WERO_NAME). */
export function getWero() {
  const id = process.env.WERO_NUMBER?.trim();
  return id ? { id, name: process.env.WERO_NAME?.trim() || null } : null;
}

/** Moyens de paiement ouverts sur le serveur. */
export function getPaymentOptions(): PaymentOptions {
  const mobile = getMobileMoney();
  return {
    paypal: !!getPaypalEmail(),
    wero: !!getWero(),
    transfer: !!getTransferDetails(),
    wave: !!mobile.wave,
    orange_money: !!mobile.orange_money,
  };
}

/** Toutes les coordonnées de paiement, pour afficher les instructions au client. */
export function getPaymentDetails() {
  return { paypalEmail: getPaypalEmail(), transfer: getTransferDetails(), mobile: getMobileMoney(), wero: getWero() };
}

/** Phrase qui explique comment payer (emails des commandes et des réservations). */
export function paymentInstructionText(method: string, totalCents: number, reference: string, proofHint: boolean) {
  const total = formatPrice(totalCents);
  const { paypalEmail, transfer, mobile, wero } = getPaymentDetails();
  const mobileNumber = isMobileMethod(method) ? mobile[method] : null;
  if (mobileNumber) {
    return `Envoie ${formatFcfa(totalCents)} (${total}) par ${METHOD_LABELS[method]} au ${mobileNumber}${mobile.name ? ` (${mobile.name})` : ""}, avec la référence ${reference} en message si possible.${proofHint ? " Ensuite, envoie la capture du paiement depuis ton espace : je valide dès réception." : ""}`;
  }
  if (method === "wero" && wero) {
    return `Envoie ${total} avec Wero (depuis l'app de ta banque ou l'app Wero) au ${wero.id}${wero.name ? ` (${wero.name})` : ""}, avec la référence ${reference} dans le message.`;
  }
  if (method === "paypal" && paypalEmail) {
    return `Envoie ${total} sur PayPal à ${paypalEmail}, en paiement de biens ou services, avec la référence ${reference} dans le message.`;
  }
  if (transfer) {
    return `Fais un virement de ${total} à ${transfer.holder}, IBAN ${transfer.iban}, avec la référence ${reference} dans le libellé.`;
  }
  return null;
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
      installerMacSize: product.installerMacSize,
      installerWinSize: product.installerWinSize,
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

/** Commandes payantes et cadeaux pour l'admin (les gratuites ne demandent aucune action), avec recherche et pages. */
export async function getAdminOrders(filters: { q?: string; status?: string; method?: string; limit: number; offset: number }) {
  const q = filters.q?.trim();
  const like = q ? `%${q}%` : null;
  const where = and(
    ne(shopOrder.method, "free"),
    like
      ? or(
          sqlLike(shopOrder.reference, like),
          sqlLike(user.name, like),
          sqlLike(user.email, like),
          exists(
            db
              .select({ one: sql`1` })
              .from(shopOrderItem)
              .where(and(eq(shopOrderItem.orderId, shopOrder.id), sqlLike(shopOrderItem.name, like))),
          ),
        )
      : undefined,
    filters.status === "gift"
      ? eq(shopOrder.method, "gift")
      : filters.status === "pending" || filters.status === "paid" || filters.status === "cancelled"
        ? and(eq(shopOrder.status, filters.status), ne(shopOrder.method, "gift"))
        : undefined,
    filters.status === "proof" ? and(eq(shopOrder.status, "pending"), isNotNull(shopOrder.proofSentAt)) : undefined,
    filters.method && (orderMethods as readonly string[]).includes(filters.method)
      ? eq(shopOrder.method, filters.method as (typeof orderMethods)[number])
      : undefined,
  );

  const [[{ total }], orders] = await Promise.all([
    db.select({ total: count() }).from(shopOrder).innerJoin(user, eq(shopOrder.userId, user.id)).where(where),
    db
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
      .where(where)
      .orderBy(desc(shopOrder.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
  ]);
  const items = await itemsByOrder(orders.map((o) => o.id));
  return { total, orders: orders.map((o) => ({ ...o, items: items.get(o.id) ?? [] })) };
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
