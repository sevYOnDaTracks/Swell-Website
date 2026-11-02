import "server-only";
import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { availability, booking } from "@/db/schema";
import { getServiceById } from "./offers";

export const TIME_ZONE = "Europe/Paris";
export const BOOKING_WINDOW_DAYS = 30;
const SLOT_STEP = 60; // un créneau possible toutes les heures

const DEFAULT_HOURS = { startTime: "10:00", endTime: "19:00" };

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Date ("YYYY-MM-DD") et minutes écoulées dans la journée, en heure de Paris. */
export function parisNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Horaires des 7 jours ; par défaut du lundi au samedi, 10h-19h. */
export async function getWeeklyHours() {
  const rows = await db.select().from(availability);
  return Array.from({ length: 7 }, (_, weekday) => {
    const row = rows.find((r) => r.weekday === weekday);
    return row ?? { weekday, enabled: weekday !== 0, ...DEFAULT_HOURS };
  });
}

/** Les jours réservables à partir d'aujourd'hui. */
export async function getBookableDays() {
  const hours = await getWeeklyHours();
  const today = parisNow().date;
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => {
    const date = addDays(today, i);
    return { date, open: hours[weekdayOf(date)].enabled };
  });
}

export function isInBookingWindow(date: string) {
  const today = parisNow().date;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && date < addDays(today, BOOKING_WINDOW_DAYS);
}

/** Plages occupées un jour donné. Une réservation « proposed » occupe le créneau proposé, pas l'ancien. */
async function takenRanges(date: string, excludeId?: string) {
  const rows = await db
    .select()
    .from(booking)
    .where(and(ne(booking.status, "cancelled"), or(eq(booking.date, date), eq(booking.proposedDate, date))));
  return rows
    .filter((b) => b.id !== excludeId)
    .flatMap((b) => {
      if (b.status !== "proposed") return b.date === date ? [[toMinutes(b.startTime), toMinutes(b.endTime)]] : [];
      return b.proposedDate === date && b.proposedStartTime && b.proposedEndTime
        ? [[toMinutes(b.proposedStartTime), toMinutes(b.proposedEndTime)]]
        : [];
    });
}

/**
 * Heures de début libres pour un service à une date donnée.
 * excludeId : réservation dont on cherche un nouveau créneau (son créneau actuel ne compte pas).
 */
export async function getAvailableSlots(date: string, serviceId: string, excludeId?: string) {
  const service = await getServiceById(serviceId);
  if (!service?.bookable || !isInBookingWindow(date)) return [];

  const hours = (await getWeeklyHours())[weekdayOf(date)];
  if (!hours.enabled) return [];

  const taken = await takenRanges(date, excludeId);

  const now = parisNow();
  const earliest = date === now.date ? now.minutes + 60 : 0; // au moins 1h à l'avance
  const open = toMinutes(hours.startTime);
  const close = toMinutes(hours.endTime);

  const slots: string[] = [];
  for (let start = open; start + service.durationMinutes <= close; start += SLOT_STEP) {
    const end = start + service.durationMinutes;
    const overlaps = taken.some(([s, e]) => start < e && end > s);
    if (start >= earliest && !overlaps) slots.push(fromMinutes(start));
  }
  return slots;
}

const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return longDate.format(new Date(Date.UTC(y, m - 1, d)));
}
