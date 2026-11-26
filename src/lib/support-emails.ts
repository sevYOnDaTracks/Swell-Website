import "server-only";
import { ADMIN_NOTIFY_EMAIL, sendEmail, SITE_URL } from "./email";
import { subjectLabel } from "./support-format";

// Emails du support. Le lien de suivi marche avec ou sans compte (il porte le jeton secret de la demande).

type Ticket = { id: string; reference: string; token: string; name: string; email: string; subject: string };

export const ticketLink = (t: { reference: string; token: string }) => `${SITE_URL}/support/suivi/${t.reference}?t=${t.token}`;
const adminLink = (t: { id: string }) => `${SITE_URL}/admin/support/${t.id}`;
const excerpt = (body: string) => (body.length > 600 ? `${body.slice(0, 600)}…` : body);

/** Nouvelle demande : accusé de réception au client, alerte à Swell. */
export async function sendTicketCreated(t: Ticket, body: string) {
  const firstName = t.name.trim().split(/\s+/)[0] || "";
  await Promise.all([
    sendEmail({
      to: t.email,
      subject: `Ta demande ${t.reference} est bien reçue`,
      title: "On a bien reçu ta demande",
      paragraphs: [
        `Salut ${firstName},`,
        `Ta demande « ${subjectLabel(t.subject)} » porte la référence ${t.reference}. On te répond au plus vite, en général dans la journée.`,
        "Tu peux suivre l'échange et ajouter des précisions depuis le lien ci-dessous.",
      ],
      cta: { label: "Suivre ma demande", href: ticketLink(t) },
    }),
    sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `Support ${t.reference} : ${subjectLabel(t.subject)}`,
      title: `Nouvelle demande de ${t.name}`,
      paragraphs: [`${t.name} (${t.email}) · ${subjectLabel(t.subject)}`, excerpt(body)],
      cta: { label: "Répondre", href: adminLink(t) },
    }),
  ]);
}

/** Swell a répondu : le client reçoit la réponse et le lien pour continuer. */
export async function sendAdminReply(t: Ticket, body: string, closed: boolean) {
  await sendEmail({
    to: t.email,
    subject: `Réponse à ta demande ${t.reference}`,
    title: closed ? "Ta demande est résolue" : "Swell t'a répondu",
    paragraphs: [
      excerpt(body),
      closed ? "Si ce n'est pas réglé, réponds depuis le lien ci-dessous : la demande sera rouverte." : "Pour répondre, utilise le lien ci-dessous.",
    ],
    cta: { label: closed ? "Voir la demande" : "Répondre", href: ticketLink(t) },
  });
}

/** Le client a répondu : alerte à Swell. */
export async function sendClientReply(t: Ticket, body: string) {
  await sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `Support ${t.reference} : nouveau message de ${t.name}`,
    title: `${t.name} a répondu`,
    paragraphs: [excerpt(body)],
    cta: { label: "Voir la demande", href: adminLink(t) },
  });
}
