"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { license, licenseActivation } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/session";

/** Le client retire un de ses ordinateurs pour activer le plugin ailleurs. */
export async function removeMyActivation(activationId: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  const mine = db.select({ id: license.id }).from(license).where(eq(license.userId, user.id));
  const deleted = await db
    .delete(licenseActivation)
    .where(and(eq(licenseActivation.id, activationId), inArray(licenseActivation.licenseId, mine)))
    .returning({ id: licenseActivation.id });
  refresh();
  return deleted.length > 0 ? { ok: true } : { error: "Cet ordinateur n'est plus enregistré." };
}

export async function setLicenseRevoked(licenseId: string, revoked: boolean) {
  await requireAdmin();
  await db.update(license).set({ revokedAt: revoked ? new Date() : null }).where(eq(license.id, licenseId));
  refresh();
}

export async function setLicenseMaxActivations(licenseId: string, max: number) {
  await requireAdmin();
  if (!Number.isInteger(max) || max < 1 || max > 20) return;
  await db.update(license).set({ maxActivations: max }).where(eq(license.id, licenseId));
  refresh();
}

export async function removeActivation(activationId: string) {
  await requireAdmin();
  await db.delete(licenseActivation).where(eq(licenseActivation.id, activationId));
  refresh();
}
