import "server-only";
import { createPrivateKey, createPublicKey, sign, type KeyObject } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { license, licenseActivation, product, shopOrder, shopOrderItem, user } from "@/db/schema";

// Licences des VST.
//
// 1. Chaque VST payé donne une clé (SWELL-XXXXX-...) visible dans « Mon espace ».
// 2. Le plugin envoie la clé et l'identifiant de l'ordinateur à /api/licenses/activate.
// 3. Le site renvoie un fichier de licence signé en Ed25519 avec LICENSE_PRIVATE_KEY.
//    Le plugin le vérifie hors ligne avec la clé publique intégrée à sa compilation :
//    personne ne peut fabriquer de licence sans la clé privée, qui ne quitte jamais le serveur.

// Sans O, 0, I ni 1, comme les références de commande : la clé se recopie sans erreur.
const KEY_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** SWELL-XXXXX-XXXXX-XXXXX-XXXXX : 100 bits de hasard, impossible à deviner. */
export function newLicenseKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = Array.from(bytes, (b) => KEY_LETTERS[b % KEY_LETTERS.length]).join("");
  return `SWELL-${chars.match(/.{5}/g)!.join("-")}`;
}

/** Remet une clé saisie à la main au format attendu (minuscules, espaces, tirets oubliés). */
export function normalizeLicenseKey(raw: string) {
  const chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^SWELL/, "");
  if (chars.length !== 20 || [...chars].some((c) => !KEY_LETTERS.includes(c))) return null;
  return `SWELL-${chars.match(/.{5}/g)!.join("-")}`;
}

/**
 * Crée les clés manquantes pour les VST payés (d'un client, ou de tous si userId est omis).
 * Appelée à l'affichage et à l'envoi des emails : aucune commande payée ne reste sans clé,
 * quel que soit le chemin qui l'a validée (paiement vérifié, gratuit, code promo à 100 %).
 */
export async function ensureLicenses(userId?: string) {
  const owned = await db
    .selectDistinct({ userId: shopOrder.userId, productId: product.id, slug: product.slug, name: product.name })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .innerJoin(product, eq(shopOrderItem.productId, product.id))
    .where(and(eq(shopOrder.status, "paid"), eq(product.type, "vst"), userId ? eq(shopOrder.userId, userId) : undefined));
  if (owned.length === 0) return;

  for (const row of owned) {
    await db
      .insert(license)
      .values({ key: newLicenseKey(), userId: row.userId, productId: row.productId, productSlug: row.slug, productName: row.name })
      .onConflictDoNothing({ target: [license.userId, license.productSlug] });
    // Acheté après un essai : la clé d'essai devient définitive, avec les 3 ordinateurs habituels.
    await db
      .update(license)
      .set({ trialEndsAt: null, maxActivations: 3 })
      .where(and(eq(license.userId, row.userId), eq(license.productSlug, row.slug), isNotNull(license.trialEndsAt)));
  }
}

/** Vrai si ce client a un essai en cours pour ce produit (donne droit au téléchargement). */
export async function hasActiveTrial(userId: string, productId: string) {
  const [row] = await db
    .select({ id: license.id })
    .from(license)
    .where(and(eq(license.userId, userId), eq(license.productId, productId), gt(license.trialEndsAt, new Date())))
    .limit(1);
  return !!row;
}

/** Licences d'un client, avec les ordinateurs où chacune est activée. */
export async function getMyLicenses(userId: string) {
  await ensureLicenses(userId);
  const licenses = await db.select().from(license).where(eq(license.userId, userId)).orderBy(asc(license.createdAt));
  return withActivations(licenses);
}

/** Licences pour l'admin, avec recherche (clé, client, email, plugin), filtre et pages. */
export async function getAdminLicenses(filters: { q?: string; state?: string; limit: number; offset: number }) {
  await ensureLicenses();
  const now = new Date();
  const q = filters.q?.trim();
  const pattern = q ? `%${q}%` : null;
  const where = and(
    pattern
      ? or(like(license.key, pattern), like(license.productName, pattern), like(user.name, pattern), like(user.email, pattern))
      : undefined,
    filters.state === "active" ? and(isNull(license.revokedAt), or(isNull(license.trialEndsAt), gt(license.trialEndsAt, now))) : undefined,
    filters.state === "revoked" ? isNotNull(license.revokedAt) : undefined,
    filters.state === "trial" ? isNotNull(license.trialEndsAt) : undefined,
    filters.state === "converted" ? and(isNotNull(license.trialStartedAt), isNull(license.trialEndsAt)) : undefined,
  );
  const [[{ total }], licenses] = await Promise.all([
    db.select({ total: count() }).from(license).innerJoin(user, eq(license.userId, user.id)).where(where),
    db
      .select({
        id: license.id,
        key: license.key,
        productSlug: license.productSlug,
        productName: license.productName,
        maxActivations: license.maxActivations,
        revokedAt: license.revokedAt,
        trialEndsAt: license.trialEndsAt,
        trialStartedAt: license.trialStartedAt,
        createdAt: license.createdAt,
        clientName: user.name,
        clientEmail: user.email,
      })
      .from(license)
      .innerJoin(user, eq(license.userId, user.id))
      .where(where)
      .orderBy(desc(license.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
  ]);
  return { total, licenses: await withActivations(licenses) };
}

/** Chiffres des démos sur toutes les licences (indépendants de la recherche). */
export async function getTrialStats() {
  const now = new Date();
  const [row] = await db
    .select({
      started: count(license.trialStartedAt),
      converted: sql<number>`sum(case when ${license.trialStartedAt} is not null and ${license.trialEndsAt} is null then 1 else 0 end)`,
      running: sql<number>`sum(case when ${license.trialEndsAt} > ${now.getTime()} then 1 else 0 end)`,
    })
    .from(license);
  return { started: row.started, converted: Number(row.converted ?? 0), running: Number(row.running ?? 0) };
}

async function withActivations<T extends { id: string }>(licenses: T[]) {
  if (licenses.length === 0) return [];
  const activations = await db
    .select()
    .from(licenseActivation)
    .where(
      inArray(
        licenseActivation.licenseId,
        licenses.map((l) => l.id),
      ),
    )
    .orderBy(asc(licenseActivation.createdAt));
  return licenses.map((l) => ({ ...l, activations: activations.filter((a) => a.licenseId === l.id) }));
}

// --- Signature -------------------------------------------------------------

let cachedKey: KeyObject | null | undefined;

/** Clé privée Ed25519 (LICENSE_PRIVATE_KEY : DER PKCS#8 en base64, générée par scripts/license-keygen.mjs). */
function signingKey() {
  if (cachedKey !== undefined) return cachedKey;
  const raw = process.env.LICENSE_PRIVATE_KEY?.trim();
  cachedKey = raw ? createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" }) : null;
  return cachedKey;
}

/** Clé publique brute (32 octets, en hexadécimal) à recopier dans le code des plugins. */
export function publicKeyHex() {
  const key = signingKey();
  if (!key) return null;
  const der = createPublicKey(key).export({ format: "der", type: "spki" });
  return der.subarray(der.length - 32).toString("hex");
}

// v1 : licence définitive. v2 : essai, avec expiresAt (les plugins d'avant les démos refusent les v2).
export type LicensePayload = {
  v: 1 | 2;
  expiresAt?: string;
  key: string;
  product: string;
  machine: string;
  email: string;
  name: string;
  issuedAt: string;
};

/**
 * Fichier de licence : base64url(JSON) + "." + base64url(signature Ed25519).
 * La signature porte sur les octets exacts de la première partie, telle qu'elle est écrite :
 * le plugin vérifie la signature puis décode le JSON, sans avoir à le reformater.
 */
export function signLicense(payload: LicensePayload) {
  const key = signingKey();
  if (!key) throw new Error("LICENSE_PRIVATE_KEY manquante");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(null, Buffer.from(body), key).toString("base64url");
  return `${body}.${signature}`;
}

// --- Activation ------------------------------------------------------------

type ActivationResult =
  | { ok: true; license: string; activations: number; maxActivations: number }
  | { ok: false; status: number; error: string; message: string };

const fail = (status: number, error: string, message: string): ActivationResult => ({ ok: false, status, error, message });

/**
 * Active une licence sur un ordinateur. Rappeler avec le même ordinateur ne prend pas de place en plus :
 * le plugin peut s'en servir pour récupérer son fichier ou vérifier de temps en temps que la licence tient toujours.
 */
export async function activateLicense(input: { key: string; product: string; machineId: string; machineName: string }): Promise<ActivationResult> {
  if (!signingKey()) return fail(503, "unavailable", "L'activation est momentanément indisponible. Réessaie plus tard.");

  const [row] = await db
    .select({ license, email: user.email, name: user.name, banned: user.banned })
    .from(license)
    .innerJoin(user, eq(license.userId, user.id))
    .where(eq(license.key, input.key));

  if (!row) return fail(404, "invalid_key", "Cette clé de licence n'existe pas. Vérifie-la dans ton espace sur swell-audio.fr.");
  if (row.license.productSlug !== input.product) {
    return fail(403, "wrong_product", `Cette clé est celle de ${row.license.productName}, pas de ce plugin.`);
  }
  if (row.license.revokedAt || row.banned) return fail(403, "revoked", "Cette licence a été désactivée. Contacte Swell si c'est une erreur.");
  const trialEndsAt = row.license.trialEndsAt;
  if (trialEndsAt && trialEndsAt <= new Date()) {
    return fail(
      403,
      "trial_expired",
      `Ton essai de ${row.license.productName} est terminé. Achète-le sur swell-audio.fr : cette même clé deviendra définitive.`,
    );
  }

  const machineName = input.machineName.slice(0, 64);
  const result = db.transaction((tx) => {
    const [existing] = tx
      .select({ id: licenseActivation.id })
      .from(licenseActivation)
      .where(and(eq(licenseActivation.licenseId, row.license.id), eq(licenseActivation.machineId, input.machineId)))
      .all();
    if (existing) {
      tx.update(licenseActivation).set({ lastSeenAt: new Date(), machineName }).where(eq(licenseActivation.id, existing.id)).run();
    } else {
      const [{ total }] = tx.select({ total: count() }).from(licenseActivation).where(eq(licenseActivation.licenseId, row.license.id)).all();
      if (total >= row.license.maxActivations) return null;
      tx.insert(licenseActivation).values({ licenseId: row.license.id, machineId: input.machineId, machineName }).run();
    }
    const [{ total }] = tx.select({ total: count() }).from(licenseActivation).where(eq(licenseActivation.licenseId, row.license.id)).all();
    return total;
  });

  if (result === null) {
    return fail(
      409,
      "too_many_machines",
      row.license.maxActivations > 1
        ? `Cette licence est déjà activée sur ${row.license.maxActivations} ordinateurs. Retire-en un depuis ton espace sur swell-audio.fr, puis réessaie.`
        : "Cette licence est déjà activée sur un autre ordinateur. Retire-le depuis ton espace sur swell-audio.fr, puis réessaie.",
    );
  }

  const file = signLicense({
    ...(trialEndsAt ? { v: 2 as const, expiresAt: trialEndsAt.toISOString() } : { v: 1 as const }),
    key: row.license.key,
    product: row.license.productSlug,
    machine: input.machineId,
    email: row.email,
    name: row.name,
    issuedAt: new Date().toISOString(),
  });
  return { ok: true, license: file, activations: result, maxActivations: row.license.maxActivations };
}

/** Libère la place d'un ordinateur (depuis le plugin, avec la clé). */
export async function deactivateLicense(input: { key: string; machineId: string }) {
  const [row] = await db.select({ id: license.id }).from(license).where(eq(license.key, input.key));
  if (!row) return false;
  const deleted = await db
    .delete(licenseActivation)
    .where(and(eq(licenseActivation.licenseId, row.id), eq(licenseActivation.machineId, input.machineId)))
    .returning({ id: licenseActivation.id });
  return deleted.length > 0;
}
