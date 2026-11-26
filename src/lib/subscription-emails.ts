import "server-only";
import { eq, max } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPeriod, subscriptionReminder, user } from "@/db/schema";
import { sendEmail, SITE_URL } from "./email";
import { SUBSCRIPTION_NAME } from "./subscription-plans";
import { getSubscriptionSettings } from "./subscriptions";

// Rappels de fin d'accès, envoyés par le cron du soir (/api/cron/reminders).
// Pas de prélèvement automatique : ces emails sont ce qui fait revenir les abonnés.
//  - pass payé ou offert : N jours avant (réglable dans l'admin), la veille, puis le jour où l'accès s'arrête ;
//  - essai gratuit : N jours avant (réglable), puis à la fin.
// Un seul email par client, date de fin et type de rappel (table subscription_reminder).

const DAY = 24 * 60 * 60 * 1000;
const longDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

type Kind = "soon" | "tomorrow" | "ended";

export async function sendSubscriptionReminders() {
  const ends = await db
    .select({ userId: subscriptionPeriod.userId, endsAt: max(subscriptionPeriod.endsAt) })
    .from(subscriptionPeriod)
    .groupBy(subscriptionPeriod.userId);

  const settings = await getSubscriptionSettings();
  const now = Date.now();
  let sent = 0;
  for (const row of ends) {
    if (!row.endsAt) continue;
    const endsAt = new Date(row.endsAt);
    const left = endsAt.getTime() - now;
    // Trop tôt pour un rappel, ou fini depuis plus de 3 jours : rien à envoyer.
    if (left > Math.max(settings.reminderDays, settings.trialReminderDays) * DAY || left < -3 * DAY) continue;

    const periods = await db.select({ kind: subscriptionPeriod.kind }).from(subscriptionPeriod).where(eq(subscriptionPeriod.userId, row.userId));
    const trialOnly = periods.every((p) => p.kind === "trial");

    const kind: Kind | null = left <= 0 ? "ended" : left <= DAY ? (trialOnly ? null : "tomorrow") : left <= (trialOnly ? settings.trialReminderDays : settings.reminderDays) * DAY ? "soon" : null;
    if (!kind) continue;

    // Noté avant l'envoi : un plantage au milieu ne renvoie jamais deux fois le même email.
    const inserted = await db
      .insert(subscriptionReminder)
      .values({ userId: row.userId, endsAt, kind })
      .onConflictDoNothing()
      .returning({ userId: subscriptionReminder.userId });
    if (inserted.length === 0) continue;

    const [client] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.userId));
    if (!client) continue;
    const firstName = client.name.trim().split(/\s+/)[0] || "";
    const cta = { label: trialOnly ? "Choisir mon pass" : "Prolonger mon accès", href: `${SITE_URL}/abonnement#formules` };
    const day = longDate.format(endsAt);

    if (kind === "ended") {
      await sendEmail({
        to: client.email,
        subject: trialOnly ? "Ton essai Swell est terminé" : `Ton accès ${SUBSCRIPTION_NAME} est arrivé à son terme`,
        title: trialOnly ? "Ton essai est terminé" : "Ton accès est arrivé à son terme",
        paragraphs: [
          `Salut ${firstName},`,
          trialOnly
            ? "Ton essai gratuit de tous les plugins Swell vient de se terminer. Pour continuer, prends un pass d'un mois ou d'un an : tes clés reprennent tout de suite, rien à réinstaller."
            : "Ton pass vient de se terminer. Tes plugins marchent encore quelques jours : prends un nouveau pass pour ne pas les perdre. Ils se débloquent tout seuls dès que le paiement est validé.",
        ],
        cta,
      });
    } else {
      await sendEmail({
        to: client.email,
        subject: kind === "tomorrow" ? `Ton accès ${SUBSCRIPTION_NAME} se termine demain` : `Ton ${trialOnly ? "essai" : "accès"} Swell se termine bientôt`,
        title: kind === "tomorrow" ? "Ton accès se termine demain" : `Ton ${trialOnly ? "essai" : "accès"} se termine ${day}`,
        paragraphs: [
          `Salut ${firstName},`,
          trialOnly
            ? `Ton essai gratuit de tous les plugins Swell se termine ${day}. Pour continuer sans coupure, prends un pass d'un mois ou d'un an : tes clés restent les mêmes.`
            : `Ton accès à tous les plugins Swell se termine ${day}. Rien n'est prélevé automatiquement : prends un nouveau pass, il s'ajoute à la suite et tu ne perds aucun jour.`,
          "Paiement par PayPal, Wero, virement, Wave ou Orange Money, comme pour une commande.",
        ],
        cta,
      });
    }
    sent += 1;
  }
  return sent;
}
