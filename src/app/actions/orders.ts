"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { product, shopOrder, shopOrderItem } from "@/db/schema";
import { sendOrderEmails } from "@/lib/order-emails";
import { getPaypalEmail, getTransferDetails, hasPurchased, newOrderReference } from "@/lib/orders";
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

  db.transaction((tx) => {
    const orderId = crypto.randomUUID();
    tx.insert(shopOrder)
      .values({ id: orderId, userId: user.id, reference: newOrderReference(), method: "free", status: "paid", totalCents: 0, paidAt: new Date() })
      .run();
    tx.insert(shopOrderItem).values({ orderId, productId: row.id, name: row.name, priceCents: 0 }).run();
  });
  return { ok: true };
}

type CheckoutResult = { ok: true; paidIds: string[] } | { needsAccount: true } | { needsVerification: true } | { error: string };

/** Crée une commande en attente de paiement. Les prix sont relus en base, jamais repris du navigateur. */
export async function createOrder(
  productIds: string[],
  waivedWithdrawal: boolean,
  method: "transfer" | "paypal",
  rawPromoCode?: string,
): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { needsAccount: true };
  if (!hasConfirmedEmail(user)) return { needsVerification: true };
  if (!waivedWithdrawal) return { error: "Coche la case pour continuer." };

  const wanted = [...new Set(productIds.filter((id) => typeof id === "string"))].slice(0, 50);
  if (wanted.length === 0) return { error: "Ton panier est vide." };

  const rows = await db.select().from(product).where(and(inArray(product.id, wanted), eq(product.published, true)));
  const payable = rows.filter((p) => p.priceCents > 0);
  if (payable.length === 0) return { error: "Aucun article payant dans ton panier." };

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
  const open = method === "paypal" ? !!getPaypalEmail() : method === "transfer" && !!getTransferDetails();
  if (!coveredByPromo && !open) return { error: "Ce moyen de paiement n'est pas encore ouvert." };

  const orderId = crypto.randomUUID();
  db.transaction((tx) => {
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
  return { ok: true, paidIds: payable.map((p) => p.id) };
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
