import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { license, product, setting, shopOrder, shopOrderItem, user } from "@/db/schema";
import { SITE_URL, sendEmail } from "@/lib/email";

// Mail « nouvelle version disponible » quand le fichier livré d'un produit est remplacé.
// Destinataires : les clients avec une commande payée (achat ou cadeau) et tous ceux qui ont
// une licence du produit, démo comprise. Une seule fois par adresse et par version : la dernière
// version annoncée est gardée dans la table setting, un second appel pour la même version ne renvoie rien.

const noticeKey = (productId: string) => `update_notice:${productId}`;
// Resend accepte quelques envois par seconde : on espace un peu.
const SEND_GAP_MS = 600;

/** Adresses (dédoublonnées) des acheteurs et testeurs d'un produit. */
export async function getUpdateRecipients(productId: string) {
  const buyers = await db
    .selectDistinct({ email: user.email, name: user.name })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .innerJoin(user, eq(shopOrder.userId, user.id))
    .where(and(eq(shopOrderItem.productId, productId), eq(shopOrder.status, "paid")));
  const licensees = await db
    .selectDistinct({ email: user.email, name: user.name })
    .from(license)
    .innerJoin(user, eq(license.userId, user.id))
    .where(and(eq(license.productId, productId), isNull(license.revokedAt)));

  const byEmail = new Map<string, { email: string; name: string }>();
  for (const r of [...buyers, ...licensees]) {
    const key = r.email.trim().toLowerCase();
    if (key && !byEmail.has(key)) byEmail.set(key, r);
  }
  return [...byEmail.values()];
}

/** Version livrée actuelle : nom du fichier (ou des installateurs Mac / Windows). */
export function currentVersionLabel(p: {
  downloadName: string | null;
  installerMacName: string | null;
  installerWinName: string | null;
}) {
  return [p.installerMacName, p.installerWinName, p.downloadName].filter(Boolean).join(" / ");
}

type Options = { version?: string; dryRun?: boolean; force?: boolean };

/**
 * Annonce la nouvelle version d'un produit à ses acheteurs et testeurs.
 * Renvoie le nombre d'adresses concernées ; `skipped` si cette version a déjà été annoncée.
 */
export async function notifyProductUpdate(productId: string, opts: Options = {}) {
  const [p] = await db.select().from(product).where(eq(product.id, productId));
  if (!p) throw new Error("Produit introuvable.");
  const version = opts.version ?? currentVersionLabel(p);
  if (!version) throw new Error("Aucun fichier livré pour ce produit.");

  const recipients = await getUpdateRecipients(p.id);
  const result = { product: p.name, slug: p.slug, version, recipients: recipients.map((r) => r.email) };
  if (opts.dryRun) return { ...result, dryRun: true, skipped: false };

  const [last] = await db.select().from(setting).where(eq(setting.key, noticeKey(p.id)));
  if (last?.value === version && !opts.force) return { ...result, recipients: [], skipped: true };
  // Noté avant l'envoi : un plantage au milieu ne renvoie jamais deux fois le même mail.
  await db
    .insert(setting)
    .values({ key: noticeKey(p.id), value: version })
    .onConflictDoUpdate({ target: setting.key, set: { value: version } });

  for (const [i, r] of recipients.entries()) {
    if (i > 0) await new Promise((res) => setTimeout(res, SEND_GAP_MS));
    const firstName = r.name.trim().split(/\s+/)[0] || "";
    await sendEmail({
      to: r.email,
      subject: `Mise à jour disponible : ${p.name}`,
      title: `${p.name} a été mis à jour`,
      paragraphs: [
        `Salut ${firstName},`,
        `Une nouvelle version de ${p.name} est disponible : ${version}.`,
        "Tu peux la télécharger dès maintenant depuis ton espace, puis l'installer par-dessus l'ancienne. Ta licence reste valable.",
      ],
      cta: { label: "Télécharger la mise à jour", href: `${SITE_URL}/compte/plugins` },
    });
  }
  return { ...result, skipped: false };
}
