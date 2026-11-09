import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { license, shopOrder, shopOrderItem, user } from "@/db/schema";
import { ADMIN_NOTIFY_EMAIL, sendEmail, SITE_URL } from "./email";
import { ensureLicenses } from "./licenses";
import { getMobileMoney, getPaypalEmail, getTransferDetails } from "./orders";
import { formatFcfa, isMobileMethod, METHOD_LABELS } from "./payments";
import { formatPrice } from "./shop-format";

// Emails des commandes. Appelés via after() : ils partent une fois la réponse
// envoyée, sans ralentir ni bloquer l'action.

export async function sendOrderEmails(orderId: string, event: "created" | "paid" | "gift" | "cancelled" | "cancelled_by_client" | "proof") {
  const [order] = await db
    .select({
      userId: shopOrder.userId,
      reference: shopOrder.reference,
      method: shopOrder.method,
      giftNote: shopOrder.giftNote,
      totalCents: shopOrder.totalCents,
      clientName: user.name,
      clientEmail: user.email,
    })
    .from(shopOrder)
    .innerJoin(user, eq(shopOrder.userId, user.id))
    .where(eq(shopOrder.id, orderId));
  if (!order) return;

  const items = await db.select({ name: shopOrderItem.name, productId: shopOrderItem.productId }).from(shopOrderItem).where(eq(shopOrderItem.orderId, orderId));
  const names = items.map((i) => i.name).join(", ");
  const total = formatPrice(order.totalCents);
  const account = { label: "Voir mes plugins et achats", href: `${SITE_URL}/compte/plugins` };

  if (event === "created") {
    const transfer = getTransferDetails();
    const paypal = getPaypalEmail();
    const byPaypal = order.method === "paypal";
    const mobile = getMobileMoney();
    const mobileNumber = isMobileMethod(order.method) ? mobile[order.method] : null;
    const instruction = mobileNumber
      ? `Envoie ${formatFcfa(order.totalCents)} (${total}) par ${METHOD_LABELS[order.method]} au ${mobileNumber}${mobile.name ? ` (${mobile.name})` : ""}, avec la référence ${order.reference} en message si possible. Ensuite, envoie la capture du paiement depuis ton espace : je valide dès réception.`
      : byPaypal && paypal
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
        title: `Nouvelle commande par ${METHOD_LABELS[order.method] ?? order.method}`,
        paragraphs: [`${order.clientName} (${order.clientEmail})`, `Articles : ${names}. Total : ${total}.`, `Référence attendue : ${order.reference}.`],
        cta: { label: "Voir les commandes", href: `${SITE_URL}/admin/commandes` },
      }),
    ]);
  }

  // Clés de licence des VST de cette commande, à saisir dans le plugin au premier lancement.
  const licenseLines = async () => {
    await ensureLicenses(order.userId);
    const productIds = items.flatMap((i) => (i.productId ? [i.productId] : []));
    const keys = productIds.length
      ? await db
          .select({ name: license.productName, key: license.key })
          .from(license)
          .where(and(eq(license.userId, order.userId), inArray(license.productId, productIds)))
      : [];
    return keys.length
      ? [
          keys.length > 1
            ? "Tes clés de licence, à saisir dans chaque plugin au premier lancement (elles restent aussi dans ton espace) :"
            : "Ta clé de licence, à saisir dans le plugin au premier lancement (elle reste aussi dans ton espace) :",
          ...keys.map((k) => `${k.name} : ${k.key}`),
          `Installer et activer pas à pas : ${SITE_URL}/boutique/aide`,
        ]
      : [];
  };

  if (event === "gift") {
    await sendEmail({
      to: order.clientEmail,
      subject: items.length > 1 ? "Swell t'offre des produits 🎁" : `Swell t'offre ${names} 🎁`,
      title: "Un cadeau t'attend",
      paragraphs: [
        `Swell t'offre ${names}. C'est déjà dans ton espace, prêt à télécharger.`,
        ...(order.giftNote ? [`« ${order.giftNote} »`] : []),
        ...(await licenseLines()),
      ],
      cta: account,
    });
  }

  if (event === "proof") {
    await sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `Justificatif reçu : commande ${order.reference}`,
      title: `Paiement ${METHOD_LABELS[order.method] ?? ""} à vérifier`,
      paragraphs: [
        `${order.clientName} (${order.clientEmail}) a envoyé la capture de son paiement.`,
        `Articles : ${names}. Montant attendu : ${formatFcfa(order.totalCents)} (${total}). Référence : ${order.reference}.`,
        "Vérifie que l'argent est bien arrivé sur ton compte, puis valide la commande.",
      ],
      cta: { label: "Voir les commandes", href: `${SITE_URL}/admin/commandes` },
    });
  }

  if (event === "paid") {
    await sendEmail({
      to: order.clientEmail,
      subject: `Ta commande ${order.reference} est prête`,
      title: "Tes fichiers sont disponibles",
      paragraphs: [
        order.totalCents === 0 ? "Ta commande est validée." : `Merci ! Ton paiement de ${total} est bien reçu.`,
        `Tu peux télécharger ${names} depuis ton espace.`,
        ...(await licenseLines()),
      ],
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

  if (event === "cancelled_by_client") {
    await Promise.all([
      sendEmail({
        to: order.clientEmail,
        subject: `Ta commande ${order.reference} est annulée`,
        title: "Commande annulée",
        paragraphs: [
          `Tu as annulé ta commande ${order.reference} (${names}, ${total}). Aucun paiement n'est attendu.`,
          "Si tu avais déjà envoyé le paiement, réponds à cet email pour que nous réglions ça.",
        ],
        cta: account,
      }),
      sendEmail({
        to: ADMIN_NOTIFY_EMAIL,
        subject: `Commande ${order.reference} annulée par le client`,
        title: "Commande annulée par le client",
        paragraphs: [`${order.clientName} (${order.clientEmail})`, `Articles : ${names}. Total : ${total}.`, "Aucun paiement n'est plus attendu pour cette référence."],
        cta: { label: "Voir les commandes", href: `${SITE_URL}/admin/commandes` },
      }),
    ]);
  }
}
