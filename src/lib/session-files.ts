import "server-only";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sessionFile } from "@/db/schema";

export type SessionFileInfo = { id: string; name: string; size: number };

/** Fichiers livrés, regroupés par réservation. */
export async function getSessionFiles(bookingIds: string[]) {
  const byBooking = new Map<string, SessionFileInfo[]>();
  if (bookingIds.length === 0) return byBooking;
  const rows = await db
    .select({ id: sessionFile.id, bookingId: sessionFile.bookingId, name: sessionFile.name, size: sessionFile.size })
    .from(sessionFile)
    .where(inArray(sessionFile.bookingId, bookingIds))
    .orderBy(asc(sessionFile.createdAt));
  for (const { bookingId, ...file } of rows) {
    const list = byBooking.get(bookingId) ?? [];
    list.push(file);
    byBooking.set(bookingId, list);
  }
  return byBooking;
}
