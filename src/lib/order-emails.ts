import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shopOrder, shopOrderItem, user } from "@/db/schema";
import { ADMIN_NOTIFY_EMAIL, sendEmail, SITE_URL } from "./email";
import { getPaypalEmail, getTransferDetails } from "./orders";
import { formatPrice } from "./shop-format";

// Emails des commandes. Appelés via after() : ils partent une fois la réponse
// envoyée, sans ralentir ni bloquer l'action.

export async function sendOrderEmails(orderId: string, event: "created" | "paid" | "cancelled") {
  const [order] = await db
    .select({
      reference: shopOrder.reference,
      method: shopOrder.method,
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
    const paypal = getPaypalEmail();
    const byPaypal = order.method === "paypal";
    const instruction = byPaypal && paypal
      ? `Envoie ${total} sur PayPal à ${paypal}, en paiement de biens ou services, avec la référence ${order.reference} dans le message.`
      : transfer
        ? `Fais un virement de ${total} à ${transfer.holder}, IBAN ${transfer.iban}, avec la référence ${order.reference} dans le libellé.`
        : "Les informations de paiement sont indiquées dans ton espace.";
    await Promise.all([
      sendEmail({
        to: order.clientEmail,
        subject: `Ta commande ${order.reference} : paiement à effectuer`,
        title: "Ta commande est enregistrée",
        paragraphs: [
          `Articles : ${names}. Total : ${total}.`,
          instruction,
          "Dès que le paiement est vérifié, tes fichiers apparaissent dans ton espace et tu reçois un email.",
        ],
        cta: account,
      }),
      sendEmail({
        to: ADMIN_NOTIFY_EMAIL,
        subject: `Nouvelle commande ${order.reference} : ${total}`,
        title: byPaypal ? "Nouvelle commande par PayPal" : "Nouvelle commande par virement",
        paragraphs: [`${order.clientName} (${order.clientEmail})`, `Articles : ${names}. Total : ${total}.`, `Référence attendue : ${order.reference}.`],
        cta: { label: "Voir les commandes", href: `${SITE_URL}/admin/commandes` },
      }),
    ]);
  }

  if (event === "paid") {
    await sendEmail({
      to: order.clientEmail,
      subject: `Ta commande ${order.reference} est prête`,
      title: "Tes fichiers sont disponibles",
      paragraphs: [order.totalCents === 0 ? "Ta commande est validée." : `Merci ! Ton paiement de ${total} est bien reçu.`, `Tu peux télécharger ${names} depuis ton espace.`],
      cta: account,
    });
  }

  if (event === "cancelled") {
    await sendEmail({
      to: order.clientEmail,
      subject: `Ta commande ${order.reference} est annulée`,
      title: "Commande annulée",
      paragraphs: [`Ta commande ${order.reference} (${names}) a été annulée.`, "Si tu as déjà payé, réponds à cet email pour que nous réglions ça."],
      cta: account,
    });
  }
}
