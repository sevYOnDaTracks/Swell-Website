import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { booking, sessionFile } from "@/db/schema";

export type SessionFileInfo = { id: string; name: string; size: number };

// Formats que les navigateurs savent lire (l'AIFF ne passe que sur Safari : téléchargement seul).
export const PLAYABLE_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  flac: "audio/flac",
};

export const isPlayable = (storedFile: string) => storedFile.split(".").pop()! in PLAYABLE_TYPES;

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

/** Tous les fichiers rendus à un client, du plus récent au plus ancien, avec leur séance d'origine. */
export async function getMySongs(userId: string) {
  const rows = await db
    .select({
      id: sessionFile.id,
      name: sessionFile.name,
      size: sessionFile.size,
      file: sessionFile.file,
      createdAt: sessionFile.createdAt,
      service: booking.service,
      date: booking.date,
    })
    .from(sessionFile)
    .innerJoin(booking, eq(sessionFile.bookingId, booking.id))
    .where(eq(booking.userId, userId))
    .orderBy(desc(sessionFile.createdAt));
  // Le nom de stockage reste côté serveur : on ne garde que « lisible ou non ».
  return rows.map(({ file, ...song }) => ({ ...song, playable: isPlayable(file) }));
}
