import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { booking, user } from "@/db/schema";
import { formatDate } from "./booking";
import { ADMIN_NOTIFY_EMAIL, sendEmail, SITE_URL } from "./email";
import { getServiceNames } from "./offers";

// Emails liés aux réservations. Appelés via after() : ils partent une fois
// la réponse envoyée, sans ralentir ni bloquer l'action.

type Event = "created" | "confirmed" | "cancelled_by_admin" | "cancelled_by_client" | "reminder";

async function loadBooking(id: string) {
  const [row] = await db
    .select({
      id: booking.id,
      service: booking.service,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      notes: booking.notes,
      clientName: user.name,
      clientEmail: user.email,
    })
    .from(booking)
    .innerJoin(user, eq(booking.userId, user.id))
    .where(eq(booking.id, id));
  return row;
}

export async function sendBookingEmails(bookingId: string, event: Event) {
  const b = await loadBooking(bookingId);
  if (!b) return;
  const serviceName = (await getServiceNames())(b.service);
  const when = `${formatDate(b.date)} de ${b.startTime} à ${b.endTime}`;
  const firstName = b.clientName.split(" ")[0];
  const account = { label: "Voir mes réservations", href: `${SITE_URL}/compte` };
  const admin = { label: "Ouvrir l'admin", href: `${SITE_URL}/admin` };

  switch (event) {
    case "created":
      await Promise.all([
        sendEmail({
          to: b.clientEmail,
          subject: `Demande de réservation reçue — ${serviceName}`,
          title: "Ta demande est bien reçue",
          paragraphs: [
            `Salut ${firstName},`,
            `Ta demande de session « ${serviceName} » le ${when} est enregistrée.`,
            "Tu recevras un email dès qu'elle sera confirmée. Tu peux l'annuler à tout moment depuis ton espace.",
          ],
          cta: account,
        }),
        sendEmail({
          to: ADMIN_NOTIFY_EMAIL,
          subject: `Nouvelle réservation : ${serviceName} — ${formatDate(b.date)} ${b.startTime}`,
          title: "Nouvelle demande de réservation",
          paragraphs: [
            `${b.clientName} (${b.clientEmail}) a réservé « ${serviceName} » le ${when}.`,
            ...(b.notes ? [`Message : « ${b.notes} »`] : []),
            "Elle est en attente : confirme-la ou annule-la depuis l'admin.",
          ],
          cta: admin,
        }),
      ]);
      break;
    case "confirmed":
      await sendEmail({
        to: b.clientEmail,
        subject: `Session confirmée — ${serviceName} le ${formatDate(b.date)}`,
        title: "Ta session est confirmée ✅",
        paragraphs: [`Salut ${firstName},`, `C'est validé : « ${serviceName} » le ${when}.`, "À très vite !"],
        cta: account,
      });
      break;
    case "cancelled_by_admin":
      await sendEmail({
        to: b.clientEmail,
        subject: `Session annulée — ${serviceName}`,
        title: "Ta session a été annulée",
        paragraphs: [
          `Salut ${firstName},`,
          `Ta session « ${serviceName} » prévue le ${when} a été annulée.`,
          "Tu peux réserver un autre créneau quand tu veux.",
        ],
        cta: { label: "Réserver un autre créneau", href: `${SITE_URL}/reserver?service=${b.service}` },
      });
      break;
    case "cancelled_by_client":
      await sendEmail({
        to: ADMIN_NOTIFY_EMAIL,
        subject: `Réservation annulée par le client — ${formatDate(b.date)} ${b.startTime}`,
        title: "Une réservation a été annulée",
        paragraphs: [`${b.clientName} (${b.clientEmail}) a annulé « ${serviceName} » prévue le ${when}.`, "Le créneau est de nouveau libre."],
        cta: admin,
      });
      break;
    case "reminder":
      await sendEmail({
        to: b.clientEmail,
        subject: `Rappel : ta session demain à ${b.startTime}`,
        title: "C'est demain !",
        paragraphs: [
          `Salut ${firstName},`,
          `Petit rappel : ta session « ${serviceName} » a lieu ${when}.`,
          "Si tu as des fichiers à préparer (pistes, références), c'est le moment.",
        ],
        cta: account,
      });
      break;
  }
}
