import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { production } from "@/db/schema";

// Section « Dernières productions » de l'accueil, gérée depuis /admin/productions.
export const PRODUCTIONS_TAG = "productions";
export const HOME_PRODUCTIONS_LIMIT = 6;

export async function getPublishedProductions() {
  "use cache";
  cacheTag(PRODUCTIONS_TAG);
  cacheLife("max");
  return db
    .select()
    .from(production)
    .where(eq(production.published, true))
    .orderBy(asc(production.position))
    .limit(HOME_PRODUCTIONS_LIMIT);
}
