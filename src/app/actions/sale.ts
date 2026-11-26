"use server";

import { refresh, updateTag } from "next/cache";
import { productTypes } from "@/db/schema";
import { saveMassSale } from "@/lib/mass-sale";
import { requireAdmin } from "@/lib/session";
import { PRODUCTS_TAG } from "@/lib/shop";
import type { MassSale } from "@/lib/shop-format";

export type MassSaleInput = Omit<MassSale, "value" | "startsAt" | "endsAt"> & { value: string; startsAt: string; endsAt: string };

/** Enregistre la promo de masse ; le catalogue et les prix sont recalculés tout de suite. */
export async function updateMassSale(input: MassSaleInput): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const raw = Number(input.value.trim().replace(",", "."));
  if (!Number.isFinite(raw) || raw <= 0) return { error: "Indique une remise supérieure à 0." };
  if (input.kind === "percent" && (!Number.isInteger(raw) || raw > 90)) return { error: "Le pourcentage doit être un nombre entier de 1 à 90." };
  const value = input.kind === "percent" ? raw : Math.round(raw * 100);
  const types = input.types.filter((t) => (productTypes as readonly string[]).includes(t));
  if (input.enabled && input.scope === "types" && types.length === 0) return { error: "Coche au moins un type de produit." };
  if (input.enabled && input.scope === "products" && input.productIds.length === 0) return { error: "Coche au moins un produit." };
  // Début à 00:00 et fin à 23:59 du jour choisi (heure du serveur, comme les autres dates de la boutique).
  const startsAt = input.startsAt ? new Date(`${input.startsAt}T00:00:00`) : null;
  const endsAt = input.endsAt ? new Date(`${input.endsAt}T23:59:59`) : null;
  if ((startsAt && Number.isNaN(startsAt.getTime())) || (endsAt && Number.isNaN(endsAt.getTime()))) return { error: "Date invalide." };
  if (startsAt && endsAt && endsAt <= startsAt) return { error: "La fin doit être après le début." };

  await saveMassSale({
    enabled: input.enabled,
    label: input.label.trim().slice(0, 30),
    kind: input.kind === "amount" ? "amount" : "percent",
    value,
    roundTo99: input.roundTo99,
    scope: input.scope,
    types,
    productIds: [...new Set(input.productIds)].slice(0, 500),
    excludeIds: [...new Set(input.excludeIds)].slice(0, 500),
    startsAt: startsAt?.toISOString() ?? null,
    endsAt: endsAt?.toISOString() ?? null,
  });
  updateTag(PRODUCTS_TAG);
  refresh();
  return { ok: true };
}
