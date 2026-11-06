"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { product, promoCode, promoKinds } from "@/db/schema";
import { normalizePromoCode, resolvePromo } from "@/lib/promos";
import { getCurrentUser, requireAdmin } from "@/lib/session";

/** Essai d'un code depuis le panier : la remise est recalculée à la commande. */
export async function checkPromo(rawCode: string, productIds: string[]) {
  const wanted = productIds.filter((id) => typeof id === "string").slice(0, 50);
  const rows = wanted.length ? await db.select({ price: product.priceCents }).from(product).where(and(inArray(product.id, wanted), eq(product.published, true))) : [];
  const subtotal = rows.reduce((sum, p) => sum + p.price, 0);
  if (subtotal === 0) return { error: "Aucun article payant dans ton panier." };
  const user = await getCurrentUser();
  return resolvePromo(String(rawCode), subtotal, user?.id);
}

type PromoInput = { code: string; kind: string; value: string; maxUses: string; expiresAt: string };

export async function createPromoCode(input: PromoInput): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  const code = normalizePromoCode(input.code);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "Le code doit faire 3 à 30 caractères : lettres, chiffres, - ou _." };
  const kind = promoKinds.find((k) => k === input.kind);
  if (!kind) return { error: "Choisis un type de remise." };

  const amount = Number(input.value.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Indique une remise supérieure à 0." };
  if (kind === "percent" && (amount > 100 || !Number.isInteger(amount))) return { error: "Le pourcentage doit être un nombre entier de 1 à 100." };
  const value = kind === "percent" ? amount : Math.round(amount * 100);

  const maxUses = input.maxUses.trim() ? Number(input.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return { error: "Le nombre d'utilisations doit être un entier positif." };

  const expiresAt = input.expiresAt ? new Date(`${input.expiresAt}T23:59:59`) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "Date d'expiration invalide." };

  const [existing] = await db.select({ id: promoCode.id }).from(promoCode).where(eq(promoCode.code, code));
  if (existing) return { error: "Ce code existe déjà." };

  await db.insert(promoCode).values({ code, kind, value, maxUses, expiresAt });
  refresh();
  return { ok: true };
}

export async function setPromoActive(id: string, active: boolean) {
  await requireAdmin();
  await db.update(promoCode).set({ active }).where(eq(promoCode.id, id));
  refresh();
}

export async function deletePromoCode(id: string) {
  await requireAdmin();
  await db.delete(promoCode).where(eq(promoCode.id, id));
  refresh();
}
