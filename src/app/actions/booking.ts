"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { availability, booking, bookingStatuses, type BookingStatus } from "@/db/schema";
import { fromMinutes, getAvailableSlots, parisNow, toMinutes } from "@/lib/booking";
import { sendBookingEmails } from "@/lib/booking-emails";
import { getServiceById } from "@/lib/offers";
import { hasConfirmedEmail, requireAdmin, requireUser } from "@/lib/session";

// Chaque action revérifie la session : on ne fait jamais confiance au client.

export async function fetchSlots(serviceId: string, date: string) {
  await requireUser();
  return getAvailableSlots(date, serviceId);
}

export async function createBooking(input: {
  serviceId: string;
  date: string;
  startTime: string;
  notes: string;
}): Promise<{ error: string; needsVerification?: true } | { ok: true }> {
  const user = await requireUser();
  if (!hasConfirmedEmail(user)) return { error: "Confirme d'abord ton adresse email pour réserver.", needsVerification: true };
  const service = await getServiceById(input.serviceId);
  if (!service?.bookable) return { error: "Service inconnu." };

  // Le créneau a pu être pris entre-temps : on recalcule juste avant d'écrire.
  const slots = await getAvailableSlots(input.date, service.id);
  if (!slots.includes(input.startTime)) {
    return { error: "Ce créneau vient d'être pris, choisis-en un autre." };
  }

  const [created] = await db
    .insert(booking)
    .values({
      userId: user.id,
      service: service.id,
      date: input.date,
      startTime: input.startTime,
      endTime: fromMinutes(toMinutes(input.startTime) + service.durationMinutes),
      notes: input.notes.trim().slice(0, 1000) || null,
    })
    .returning({ id: booking.id });
  after(() => sendBookingEmails(created.id, "created"));
  return { ok: true };
}

export async function cancelMyBooking(id: string) {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(booking)
    .where(and(eq(booking.id, id), eq(booking.userId, user.id)));
  if (!row || row.status === "cancelled" || row.date < parisNow().date) return;

  await db.update(booking).set({ status: "cancelled" }).where(eq(booking.id, id));
  after(() => sendBookingEmails(id, "cancelled_by_client"));
  refresh();
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  await requireAdmin();
  if (!bookingStatuses.includes(status)) return;
  const [current] = await db.select({ status: booking.status }).from(booking).where(eq(booking.id, id));
  if (!current || current.status === status) return;
  // Confirmer ou annuler retire une éventuelle proposition de créneau en cours.
  await db
    .update(booking)
    .set({ status, proposedDate: null, proposedStartTime: null, proposedEndTime: null, proposalNote: null })
    .where(eq(booking.id, id));
  if (status === "confirmed") after(() => sendBookingEmails(id, "confirmed"));
  if (status === "cancelled") after(() => sendBookingEmails(id, "cancelled_by_admin"));
  refresh();
}

/** Créneaux libres pour proposer un autre horaire à une réservation (admin). */
export async function fetchProposalSlots(id: string, date: string) {
  await requireAdmin();
  const [row] = await db.select({ service: booking.service }).from(booking).where(eq(booking.id, id));
  return row ? getAvailableSlots(date, row.service, id) : [];
}

export async function proposeNewSlot(input: {
  id: string;
  date: string;
  startTime: string;
  note: string;
}): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  const [row] = await db.select().from(booking).where(eq(booking.id, input.id));
  if (!row || row.status === "cancelled") return { error: "Réservation introuvable." };
  const service = await getServiceById(row.service);
  if (!service) return { error: "Service inconnu." };

  const slots = await getAvailableSlots(input.date, row.service, row.id);
  if (!slots.includes(input.startTime)) return { error: "Ce créneau n'est pas libre, choisis-en un autre." };

  await db
    .update(booking)
    .set({
      status: "proposed",
      proposedDate: input.date,
      proposedStartTime: input.startTime,
      proposedEndTime: fromMinutes(toMinutes(input.startTime) + service.durationMinutes),
      proposalNote: input.note.trim().slice(0, 500) || null,
    })
    .where(eq(booking.id, row.id));
  after(() => sendBookingEmails(row.id, "proposed"));
  refresh();
  return { ok: true };
}

/** Réponse du client au créneau proposé : accepté, il remplace l'ancien et la session est confirmée. */
export async function answerProposal(id: string, accept: boolean): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(booking)
    .where(and(eq(booking.id, id), eq(booking.userId, user.id)));
  if (!row || row.status !== "proposed" || !row.proposedDate || !row.proposedStartTime || !row.proposedEndTime) {
    return { error: "Cette proposition n'est plus valable." };
  }

  const cleared = { proposedDate: null, proposedStartTime: null, proposedEndTime: null, proposalNote: null };
  if (accept) {
    await db
      .update(booking)
      .set({
        status: "confirmed",
        date: row.proposedDate,
        startTime: row.proposedStartTime,
        endTime: row.proposedEndTime,
        reminderSentAt: null,
        ...cleared,
      })
      .where(eq(booking.id, id));
    after(() => sendBookingEmails(id, "proposal_accepted"));
  } else {
    await db
      .update(booking)
      .set({ status: "cancelled", ...cleared })
      .where(eq(booking.id, id));
    after(() => sendBookingEmails(id, "proposal_declined"));
  }
  refresh();
  return { ok: true };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveWeeklyHours(formData: FormData): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();

  const rows = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    enabled: formData.get(`enabled-${weekday}`) === "on",
    startTime: String(formData.get(`start-${weekday}`) ?? ""),
    endTime: String(formData.get(`end-${weekday}`) ?? ""),
  }));

  for (const r of rows) {
    if (!TIME.test(r.startTime) || !TIME.test(r.endTime) || r.startTime >= r.endTime) {
      return { error: "Vérifie les horaires : l'heure de fin doit être après l'heure de début." };
    }
  }

  for (const r of rows) {
    await db
      .insert(availability)
      .values(r)
      .onConflictDoUpdate({
        target: availability.weekday,
        set: { enabled: r.enabled, startTime: r.startTime, endTime: r.endTime },
      });
  }
  refresh();
  return { ok: true };
}
