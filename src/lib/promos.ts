import "server-only";
import { and, desc, eq, ne, count } from "drizzle-orm";
import { db } from "@/db";
import { promoCode, shopOrder } from "@/db/schema";

export const normalizePromoCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, "");

/** Nombre d'utilisations : une commande annulée rend la sienne. */
async function usesOf(code: string, userId?: string) {
  const conditions = [eq(shopOrder.promoCode, code), ne(shopOrder.status, "cancelled")];
  if (userId) conditions.push(eq(shopOrder.userId, userId));
  const [row] = await db.select({ total: count() }).from(shopOrder).where(and(...conditions));
  return row.total;
}

function discountFor(promo: typeof promoCode.$inferSelect, subtotalCents: number) {
  const discount = promo.kind === "percent" ? Math.round((subtotalCents * promo.value) / 100) : promo.value;
  return Math.min(discount, subtotalCents);
}

/** Vérifie un code sur le serveur et calcule la remise. Le client ne fournit jamais le montant. */
export async function resolvePromo(rawCode: string, subtotalCents: number, userId?: string) {
  const code = normalizePromoCode(rawCode);
  const [promo] = code ? await db.select().from(promoCode).where(eq(promoCode.code, code)) : [];
  if (!promo || !promo.active) return { error: "Ce code promo n'est pas valable." } as const;
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return { error: "Ce code promo a expiré." } as const;
  if (promo.maxUses !== null && (await usesOf(code)) >= promo.maxUses) return { error: "Ce code promo n'est plus disponible." } as const;
  if (userId && (await usesOf(code, userId)) > 0) return { error: "Tu as déjà utilisé ce code promo." } as const;
  return { code, discountCents: discountFor(promo, subtotalCents) } as const;
}

/** Tous les codes, avec leurs utilisations, pour l'admin. */
export async function getPromoCodes() {
  const promos = await db.select().from(promoCode).orderBy(desc(promoCode.createdAt));
  return Promise.all(promos.map(async (p) => ({ ...p, uses: await usesOf(p.code) })));
}
