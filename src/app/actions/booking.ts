"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { availability, booking, bookingStatuses, type BookingStatus } from "@/db/schema";
import {
  fromMinutes,
  getAvailableSlots,
  getService,
  parisNow,
  toMinutes,
} from "@/lib/booking";
import { requireAdmin, requireUser } from "@/lib/session";

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
}): Promise<{ error: string } | { ok: true }> {
  const user = await requireUser();
  const service = getService(input.serviceId);
  if (!service) return { error: "Service inconnu." };

  // Le créneau a pu être pris entre-temps : on recalcule juste avant d'écrire.
  const slots = await getAvailableSlots(input.date, service.id);
  if (!slots.includes(input.startTime)) {
    return { error: "Ce créneau vient d'être pris, choisis-en un autre." };
  }

  await db.insert(booking).values({
    userId: user.id,
    service: service.id,
    date: input.date,
    startTime: input.startTime,
    endTime: fromMinutes(toMinutes(input.startTime) + service.duration),
    notes: input.notes.trim().slice(0, 1000) || null,
  });
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
  refresh();
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  await requireAdmin();
  if (!bookingStatuses.includes(status)) return;
  await db.update(booking).set({ status }).where(eq(booking.id, id));
  refresh();
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
