"use server";

import { count, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { sessionFile } from "@/db/schema";
import { sendSessionFilesEmail } from "@/lib/booking-emails";
import { deletePrivateFile } from "@/lib/private-storage";
import { requireAdmin } from "@/lib/session";

export async function removeSessionFile(id: string) {
  await requireAdmin();
  const [row] = await db.select().from(sessionFile).where(eq(sessionFile.id, id));
  if (!row) return;
  await db.delete(sessionFile).where(eq(sessionFile.id, id));
  await deletePrivateFile(row.file);
  refresh();
}

/** Envoi manuel, une fois tous les fichiers déposés : un seul e-mail au client, pas un par fichier. */
export async function notifySessionFiles(bookingId: string): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  const [{ total }] = await db.select({ total: count() }).from(sessionFile).where(eq(sessionFile.bookingId, bookingId));
  if (total === 0) return { error: "Aucun fichier à annoncer." };
  await sendSessionFilesEmail(bookingId, total);
  return { ok: true };
}
