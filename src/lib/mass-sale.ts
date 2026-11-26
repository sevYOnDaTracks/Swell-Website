import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { setting } from "@/db/schema";
import { DEFAULT_MASS_SALE, type MassSale } from "./shop-format";

const KEY = "mass_sale";

/** Promo de masse enregistrée (Admin → Boutique). */
export async function getMassSale(): Promise<MassSale> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, KEY));
  if (!row) return DEFAULT_MASS_SALE;
  try {
    return { ...DEFAULT_MASS_SALE, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_MASS_SALE;
  }
}

export async function saveMassSale(value: MassSale) {
  const json = JSON.stringify(value);
  await db.insert(setting).values({ key: KEY, value: json }).onConflictDoUpdate({ target: setting.key, set: { value: json } });
}
