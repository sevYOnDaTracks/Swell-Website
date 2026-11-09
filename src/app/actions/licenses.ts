"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { license, licenseActivation, product } from "@/db/schema";
import { sendEmail, SITE_URL } from "@/lib/email";
import { newLicenseKey } from "@/lib/licenses";
import { hasPurchased } from "@/lib/orders";
import { getCurrentUser, hasConfirmedEmail, requireAdmin, requireUser } from "@/lib/session";

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

type TrialResult = { ok: true } | { needsAccount: true } | { needsVerification: true } | { error: string };

/**
 * Démo d'un VST pour un compte connecté : une clé d'essai, valable trialDays jours sur 1 ordinateur.
 * Un seul essai par compte et par plugin. À l'achat, la même clé devient définitive (ensureLicenses).
 */
export async function startTrial(productId: string): Promise<TrialResult> {
  const user = await getCurrentUser();
  if (!user) return { needsAccount: true };
  if (!hasConfirmedEmail(user)) return { needsVerification: true };

  const [row] = await db.select().from(product).where(and(eq(product.id, productId), eq(product.published, true)));
  if (!row || row.type !== "vst" || !row.trialDays || row.trialDays <= 0) return { error: "Pas de démo pour ce produit." };
  if (!row.downloadFile) return { error: "Le plugin n'est pas encore disponible." };
  if (await hasPurchased(user.id, row.id)) return { error: `Tu possèdes déjà ${row.name} : il est dans ton espace.` };

  const [existing] = await db
    .select({ trialEndsAt: license.trialEndsAt })
    .from(license)
    .where(and(eq(license.userId, user.id), eq(license.productSlug, row.slug)));
  if (existing) {
    if (existing.trialEndsAt && existing.trialEndsAt > new Date()) return { ok: true }; // essai déjà en cours
    return { error: `Tu as déjà profité de l'essai de ${row.name}.` };
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + row.trialDays * 24 * 60 * 60 * 1000);
  const key = newLicenseKey();
  await db
    .insert(license)
    .values({
      key,
      userId: user.id,
      productId: row.id,
      productSlug: row.slug,
      productName: row.name,
      maxActivations: 1,
      trialStartedAt: now,
      trialEndsAt: endsAt,
    })
    .onConflictDoNothing({ target: [license.userId, license.productSlug] });

  const until = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(endsAt);
  after(() =>
    sendEmail({
      to: user.email,
      subject: `Ton essai de ${row.name} commence 🎧`,
      title: `${row.trialDays} jours pour essayer ${row.name}`,
      paragraphs: [
        `Ton essai est actif jusqu'au ${until}. Télécharge le plugin depuis ton espace, puis colle cette clé au premier lancement :`,
        key,
        "Si tu l'achètes, cette même clé devient définitive : rien à réinstaller.",
      ],
      cta: { label: "Ouvrir mon espace", href: `${SITE_URL}/compte/plugins` },
    }),
  );
  return { ok: true };
}
