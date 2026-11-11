import { eq } from "drizzle-orm";
import { db } from "@/db";
import { booking, sessionFile } from "@/db/schema";
import { extensionOf, MAX_DOWNLOAD_BYTES, savePrivateStream, SESSION_EXTENSIONS } from "@/lib/private-storage";
import { getCurrentUser } from "@/lib/session";
import { UploadError } from "@/lib/storage";

// Envoi (PUT) d'un fichier livré au client après une séance, réservé à l'admin.
// Route dédiée plutôt qu'une Server Action : le fichier est écrit en flux, sans limite de 25 Mo.
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/bookings/[id]/files">) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return Response.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await ctx.params;
  const [row] = await db.select({ id: booking.id }).from(booking).where(eq(booking.id, id));
  if (!row) return Response.json({ error: "Séance introuvable." }, { status: 404 });

  const originalName = decodeURIComponent(request.headers.get("x-file-name") ?? "").replace(/[/\\]/g, "").slice(0, 200);
  const ext = extensionOf(originalName, SESSION_EXTENSIONS);
  if (!ext) return Response.json({ error: "Format accepté : WAV, MP3, AIFF, FLAC, M4A, ZIP, RAR ou 7Z." }, { status: 400 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_DOWNLOAD_BYTES) return Response.json({ error: "Fichier trop lourd (2 Go max)." }, { status: 413 });
  if (!request.body) return Response.json({ error: "Fichier manquant." }, { status: 400 });

  try {
    const { name, size } = await savePrivateStream(request.body, ext);
    await db.insert(sessionFile).values({ bookingId: row.id, file: name, name: originalName, size });
    return Response.json({ ok: true, name: originalName, size });
  } catch (e) {
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
