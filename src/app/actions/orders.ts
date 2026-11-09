"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { product, shopOrder, shopOrderItem, user as userTable } from "@/db/schema";
import { sendOrderEmails } from "@/lib/order-emails";
import { getPaymentOptions, hasPurchased, newOrderReference } from "@/lib/orders";
import type { PayMethod } from "@/lib/payments";
import { resolvePromo } from "@/lib/promos";
import { getCurrentUser, hasConfirmedEmail, requireAdmin, requireUser } from "@/lib/session";

const MAX_PENDING_ORDERS = 5;

type ClaimResult = { ok: true } | { needsAccount: true } | { needsVerification: true } | { error: string };

/** Ajoute un produit gratuit à « Mes achats » : le téléchargement passe ensuite par le contrôle habituel. */
export async function claimFreeProduct(productId: string): Promise<ClaimResult> {
  const user = await getCurrentUser();
  if (!user) return { needsAccount: true };
  if (!hasConfirmedEmail(user)) return { needsVerification: true };

  const [row] = await db.select().from(product).where(and(eq(product.id, productId), eq(product.published, true)));
  if (!row || row.priceCents !== 0) return { error: "Ce produit n'est pas gratuit." };
  if (!row.downloadFile) return { error: "Le fichier n'est pas encore disponible." };
  if (await hasPurchased(user.id, row.id)) return { ok: true };

  db.transaction((tx) => insertFreeOrder(tx, user.id, [row]));
  return { ok: true };
}

// doneIds : produits à retirer du panier (payants commandés, gratuits ajoutés ou déjà possédés).
type CheckoutResult = { ok: true; doneIds: string[] } | { needsAccount: true } | { needsVerification: true } | { error: string };

/**
 * Valide le panier. Les produits gratuits vont tout de suite dans « Mes achats » ;
 * les payants forment une commande en attente de paiement. Les prix sont relus en base, jamais repris du navigateur.
 */
export async function createOrder(
  productIds: string[],
  waivedWithdrawal: boolean,
  method: PayMethod,
  rawPromoCode?: string,
): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { needsAccount: true };
  if (!hasConfirmedEmail(user)) return { needsVerification: true };

  const wanted = [...new Set(productIds.filter((id) => typeof id === "string"))].slice(0, 50);
  if (wanted.length === 0) return { error: "Ton panier est vide." };

  const rows = await db.select().from(product).where(and(inArray(product.id, wanted), eq(product.published, true)));
  const payable = rows.filter((p) => p.priceCents > 0);

  // Gratuits : ceux déjà possédés sont simplement retirés du panier, ceux sans fichier y restent.
  const freeRows = rows.filter((p) => p.priceCents === 0 && p.downloadFile);
  const owned = new Set<string>();
  for (const p of freeRows) {
    if (await hasPurchased(user.id, p.id)) owned.add(p.id);
  }
  const freeToClaim = freeRows.filter((p) => !owned.has(p.id));
  const freeDoneIds = freeRows.map((p) => p.id);

  if (payable.length === 0) {
    if (freeRows.length === 0) {
      const unavailableFree = rows.find((p) => p.priceCents === 0);
      return { error: unavailableFree ? `${unavailableFree.name} n'est pas encore disponible.` : "Ton panier est vide." };
    }
    if (freeToClaim.length > 0) db.transaction((tx) => insertFreeOrder(tx, user.id, freeToClaim));
    return { ok: true, doneIds: freeDoneIds };
  }

  if (!waivedWithdrawal) return { error: "Coche la case pour continuer." };

  const unavailable = payable.find((p) => !p.downloadFile);
  if (unavailable) return { error: `${unavailable.name} n'est pas encore disponible : retire-le du panier.` };

  for (const p of payable) {
    if (await hasPurchased(user.id, p.id)) return { error: `Tu possèdes déjà ${p.name} : retire-le du panier.` };
  }

  const [pending] = await db
    .select({ total: count() })
    .from(shopOrder)
    .where(and(eq(shopOrder.userId, user.id), eq(shopOrder.status, "pending")));
  if (pending.total >= MAX_PENDING_ORDERS) return { error: "Tu as déjà plusieurs commandes en attente : règle-les d'abord." };

  const subtotal = payable.reduce((sum, p) => sum + p.priceCents, 0);
  const promo = rawPromoCode?.trim() ? await resolvePromo(rawPromoCode, subtotal, user.id) : null;
  if (promo && "error" in promo) return { error: promo.error ?? "Ce code promo n'est pas valable." };
  const discountCents = promo?.discountCents ?? 0;
  const total = subtotal - discountCents;

  // Une remise de 100 % ne demande aucun paiement : la commande est validée tout de suite.
  const coveredByPromo = total === 0;
  const open = !!getPaymentOptions()[method];
  if (!coveredByPromo && !open) return { error: "Ce moyen de paiement n'est pas encore ouvert." };

  const orderId = crypto.randomUUID();
  db.transaction((tx) => {
    if (freeToClaim.length > 0) insertFreeOrder(tx, user.id, freeToClaim);
    tx.insert(shopOrder)
      .values({
        id: orderId,
        userId: user.id,
        reference: newOrderReference(),
        method: coveredByPromo ? "free" : method,
        status: coveredByPromo ? "paid" : "pending",
        paidAt: coveredByPromo ? new Date() : null,
        totalCents: total,
        promoCode: promo?.code ?? null,
        discountCents,
        withdrawalWaivedAt: new Date(),
      })
      .run();
    for (const p of payable) {
      tx.insert(shopOrderItem).values({ orderId, productId: p.id, name: p.name, priceCents: p.priceCents }).run();
    }
  });

  after(() => sendOrderEmails(orderId, coveredByPromo ? "paid" : "created"));
  return { ok: true, doneIds: [...payable.map((p) => p.id), ...freeDoneIds] };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Une commande gratuite, validée d'office, comme claimFreeProduct. */
function insertFreeOrder(tx: Tx, userId: string, items: { id: string; name: string }[]) {
  const orderId = crypto.randomUUID();
  tx.insert(shopOrder)
    .values({ id: orderId, userId, reference: newOrderReference(), method: "free", status: "paid", totalCents: 0, paidAt: new Date() })
    .run();
  for (const p of items) {
    tx.insert(shopOrderItem).values({ orderId, productId: p.id, name: p.name, priceCents: 0 }).run();
  }
}

/**
 * L'admin offre des produits à un compte : une commande « offerte », validée d'office.
 * Elle passe par le même chemin qu'un achat : « Mes achats », clé de licence des VST, email.
 */
export async function giftProducts(userId: string, productIds: string[], rawNote: string): Promise<{ ok: true; gifted: string[] } | { error: string }> {
  await requireAdmin();
  const [target] = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.id, userId));
  if (!target) return { error: "Ce compte n'existe plus." };

  const wanted = [...new Set(productIds.filter((id) => typeof id === "string"))].slice(0, 50);
  if (wanted.length === 0) return { error: "Choisis au moins un produit." };

  // Non publiés compris : on peut offrir un plugin avant sa sortie.
  const rows = await db.select().from(product).where(inArray(product.id, wanted));
  const toGift: typeof rows = [];
  for (const p of rows) {
    if (!(await hasPurchased(userId, p.id))) toGift.push(p);
  }
  if (toGift.length === 0) return { error: rows.length > 1 ? "Ce compte possède déjà ces produits." : "Ce compte possède déjà ce produit." };

  const note = rawNote.trim().slice(0, 500) || null;
  const orderId = crypto.randomUUID();
  db.transaction((tx) => {
    tx.insert(shopOrder)
      .values({ id: orderId, userId, reference: newOrderReference(), method: "gift", status: "paid", totalCents: 0, paidAt: new Date(), giftNote: note })
      .run();
    for (const p of toGift) {
      tx.insert(shopOrderItem).values({ orderId, productId: p.id, name: p.name, priceCents: 0 }).run();
    }
  });

  after(() => sendOrderEmails(orderId, "gift"));
  refresh();
  return { ok: true, gifted: toGift.map((p) => p.name) };
}

/** Passe une commande en attente à un nouvel état : seul un état « en attente » peut changer. */
async function settleOrder(orderId: string, status: "paid" | "cancelled") {
  await requireAdmin();
  const updated = await db
    .update(shopOrder)
    .set({ status, paidAt: status === "paid" ? new Date() : null })
    .where(and(eq(shopOrder.id, orderId), eq(shopOrder.status, "pending")))
    .returning({ id: shopOrder.id });
  if (updated.length > 0) after(() => sendOrderEmails(orderId, status));
  refresh();
}

export async function markOrderPaid(orderId: string) {
  await settleOrder(orderId, "paid");
}

export async function cancelOrder(orderId: string) {
  await settleOrder(orderId, "cancelled");
}

/** Le client annule sa propre commande, tant qu'elle attend encore le paiement. */
export async function cancelMyOrder(orderId: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  const updated = await db
    .update(shopOrder)
    .set({ status: "cancelled" })
    .where(and(eq(shopOrder.id, orderId), eq(shopOrder.userId, user.id), eq(shopOrder.status, "pending")))
    .returning({ id: shopOrder.id });
  refresh();
  if (updated.length === 0) return { error: "Cette commande ne peut plus être annulée." };
  after(() => sendOrderEmails(orderId, "cancelled_by_client"));
  return { ok: true };
}
