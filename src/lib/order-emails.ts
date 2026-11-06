import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shopOrder, shopOrderItem, user } from "@/db/schema";
import { ADMIN_NOTIFY_EMAIL, sendEmail, SITE_URL } from "./email";
import { getTransferDetails } from "./orders";
import { formatPrice } from "./shop-format";

// Emails des commandes. Appelés via after() : ils partent une fois la réponse
// envoyée, sans ralentir ni bloquer l'action.

export async function sendOrderEmails(orderId: string, event: "created" | "paid" | "cancelled") {
  const [order] = await db
    .select({
      reference: shopOrder.reference,
      totalCents: shopOrder.totalCents,
      clientName: user.name,
      clientEmail: user.email,
    })
    .from(shopOrder)
    .innerJoin(user, eq(shopOrder.userId, user.id))
    .where(eq(shopOrder.id, orderId));
  if (!order) return;

  const items = await db.select({ name: shopOrderItem.name }).from(shopOrderItem).where(eq(shopOrderItem.orderId, orderId));
  const names = items.map((i) => i.name).join(", ");
  const total = formatPrice(order.totalCents);
  const account = { label: "Ouvrir mon espace", href: `${SITE_URL}/compte` };

  if (event === "created") {
    const transfer = getTransferDetails();
    await Promise.all([
      sendEmail({
        to: order.clientEmail,
        subject: `Ta commande ${order.reference} : virement à effectuer`,
        title: "Ta commande est enregistrée",
        paragraphs: [
          `Articles : ${names}. Total : ${total}.`,
          transfer
            ? `Fais un virement de ${total} à ${transfer.holder}, IBAN ${transfer.iban}, avec la référence ${order.reference} dans le libellé.`
            : "Les coordonnées du virement sont indiquées dans ton espace.",
          "Dès que le virement est reçu, tes fichiers apparaissent dans ton espace et tu reçois un email.",
        ],
        cta: account,
      }),
      sendEmail({
        to: ADMIN_NOTIFY_EMAIL,
        subject: `Nouvelle commande ${order.reference} : ${total}`,
        title: "Nouvelle commande par virement",
        paragraphs: [`${order.clientName} (${order.clientEmail})`, `Articles : ${names}. Total : ${total}.`, `Référence attendue : ${order.reference}.`],
        cta: { label: "Voir les commandes", href: `${SITE_URL}/admin/commandes` },
      }),
    ]);
  }

  if (event === "paid") {
    await sendEmail({
      to: order.clientEmail,
      subject: `Paiement reçu : ta commande ${order.reference} est prête`,
      title: "Tes fichiers sont disponibles",
      paragraphs: [`Merci ! Ton virement de ${total} est bien reçu.`, `Tu peux télécharger ${names} depuis ton espace.`],
      cta: account,
    });
  }

  if (event === "cancelled") {
    await sendEmail({
      to: order.clientEmail,
      subject: `Ta commande ${order.reference} est annulée`,
      title: "Commande annulée",
      paragraphs: [`Ta commande ${order.reference} (${names}) a été annulée.`, "Si tu as déjà fait le virement, réponds à cet email pour que nous réglions ça."],
      cta: account,
    });
  }
}
