import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { booking } from "@/db/schema";
import { addDays, parisNow } from "@/lib/booking";
import { sendBookingEmails } from "@/lib/booking-emails";

// Rappel la veille des sessions confirmées. Appelée chaque soir par le cron
// du serveur avec l'en-tête Authorization: Bearer <CRON_SECRET>.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Accès refusé", { status: 401 });
  }

  const tomorrow = addDays(parisNow().date, 1);
  const due = await db
    .select({ id: booking.id })
    .from(booking)
    .where(and(eq(booking.date, tomorrow), eq(booking.status, "confirmed"), isNull(booking.reminderSentAt)));

  for (const { id } of due) {
    await sendBookingEmails(id, "reminder");
    await db.update(booking).set({ reminderSentAt: new Date() }).where(eq(booking.id, id));
  }
  return Response.json({ date: tomorrow, sent: due.length });
}
