import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPeriod, subscriptionReminder, user } from "@/db/schema";
import { sendEmail, SITE_URL } from "./email";
import { findFormula } from "./subscription-plans";
import { getSubscriptionSettings } from "./subscriptions";

// Rappels de fin d'accès, envoyés par le cron du soir (/api/cron/reminders), formule par formule.
// Pas de prélèvement automatique : ces emails sont ce qui fait revenir les abonnés.
//  - pass payé ou offert : N jours avant (réglable dans l'admin), la veille, puis le jour où l'accès s'arrête ;
//  - essai gratuit : N jours avant (réglable), puis à la fin.
// Un seul email par client, formule, date de fin et type de rappel (table subscription_reminder).

const DAY = 24 * 60 * 60 * 1000;
const longDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

type Kind = "soon" | "tomorrow" | "ended";

export async function sendSubscriptionReminders() {
  const settings = await getSubscriptionSettings();
  const periods = await db.select().from(subscriptionPeriod).orderBy(asc(subscriptionPeriod.endsAt));
  const groups = new Map<string, typeof periods>();
  const paidUsers = new Set<string>();
  for (const p of periods) {
    const formulaId = p.formulaId ?? settings.formulas[0]?.id ?? "";
    const key = `${p.userId}\u0000${formulaId}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
    if (p.kind !== "trial") paidUsers.add(p.userId);
  }

  const now = Date.now();
  let sent = 0;
  for (const [key, list] of groups) {
    const [userId, formulaId] = key.split("\u0000");
    const endsAt = list[list.length - 1].endsAt;
    const left = endsAt.getTime() - now;
    // Trop tôt pour un rappel, ou fini depuis plus de 3 jours : rien à envoyer.
    if (left > Math.max(settings.reminderDays, settings.trialReminderDays) * DAY || left < -3 * DAY) continue;
    const trialOnly = !paidUsers.has(userId);
    const formula = findFormula(settings, formulaId);
    // Formule supprimée depuis : plus rien à renouveler.
    if (!formula) continue;

    const kind: Kind | null =
      left <= 0 ? "ended" : left <= DAY ? (trialOnly ? null : "tomorrow") : left <= (trialOnly ? settings.trialReminderDays : settings.reminderDays) * DAY ? "soon" : null;
    if (!kind) continue;

    // Noté avant l'envoi : un plantage au milieu ne renvoie jamais deux fois le même email.
    const inserted = await db
      .insert(subscriptionReminder)
      .values({ userId, endsAt, kind: `${formula.id}:${kind}` })
      .onConflictDoNothing()
      .returning({ userId: subscriptionReminder.userId });
    if (inserted.length === 0) continue;

    const [client] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, userId));
    if (!client) continue;
    const firstName = client.name.trim().split(/\s+/)[0] || "";
    const cta = { label: trialOnly ? "Choisir mon pass" : "Prolonger mon accès", href: `${SITE_URL}/abonnement#formules` };
    const day = longDate.format(endsAt);
    const name = formula.name;

    if (kind === "ended") {
      await sendEmail({
        to: client.email,
        subject: trialOnly ? `Ton essai ${name} est terminé` : `Ton abonnement ${name} est arrivé à son terme`,
        title: trialOnly ? "Ton essai est terminé" : "Ton accès est arrivé à son terme",
        paragraphs: [
          `Salut ${firstName},`,
          trialOnly
            ? `Ton essai gratuit de ${name} vient de se terminer. Pour continuer, prends un pass d'un mois ou d'un an : tes clés reprennent tout de suite, rien à réinstaller.`
            : `Ton pass ${name} vient de se terminer. Tes plugins marchent encore quelques jours : prends un nouveau pass pour ne pas les perdre. Ils se débloquent tout seuls dès que le paiement est validé.`,
        ],
        cta,
      });
    } else {
      await sendEmail({
        to: client.email,
        subject: kind === "tomorrow" ? `Ton abonnement ${name} se termine demain` : `Ton ${trialOnly ? "essai" : "abonnement"} ${name} se termine bientôt`,
        title: kind === "tomorrow" ? "Ton accès se termine demain" : `Ton ${trialOnly ? "essai" : "accès"} se termine ${day}`,
        paragraphs: [
          `Salut ${firstName},`,
          trialOnly
            ? `Ton essai gratuit de ${name} se termine ${day}. Pour continuer sans coupure, prends un pass d'un mois ou d'un an : tes clés restent les mêmes.`
            : `Ton accès à ${name} se termine ${day}. Rien n'est prélevé automatiquement : prends un nouveau pass, il s'ajoute à la suite et tu ne perds aucun jour.`,
          "Paiement par PayPal, Wero, virement, Wave ou Orange Money, comme pour une commande.",
        ],
        cta,
      });
    }
    sent += 1;
  }
  return sent;
}
