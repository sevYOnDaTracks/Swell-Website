import { eq } from "drizzle-orm";
import { db } from "@/db";
import { booking, sessionFile } from "@/db/schema";
import { privateFileSize, streamPrivateFile } from "@/lib/private-storage";
import { getCurrentUser } from "@/lib/session";
import { PLAYABLE_TYPES } from "@/lib/session-files";

// Fichier de séance : seul le client de la séance (ou l'admin) y a accès.
// Par défaut, téléchargement. Avec ?ecouter=1, lecture dans le navigateur (avance rapide comprise).
export async function GET(request: Request, ctx: RouteContext<"/api/seances/fichiers/[fileId]">) {
  const user = await getCurrentUser();
  if (!user) {
    // Adresse relative : derrière Nginx, request.url pointe vers le serveur interne.
    return new Response(null, { status: 307, headers: { Location: "/connexion?next=%2Fcompte%2Fsons" } });
  }

  const { fileId } = await ctx.params;
  const [row] = await db
    .select({ file: sessionFile.file, name: sessionFile.name, ownerId: booking.userId })
    .from(sessionFile)
    .innerJoin(booking, eq(sessionFile.bookingId, booking.id))
    .where(eq(sessionFile.id, fileId));
  // Même réponse que pour un fichier inexistant : on ne révèle rien des séances des autres.
  if (!row || (row.ownerId !== user.id && user.role !== "admin")) return new Response("Fichier introuvable", { status: 404 });

  const size = await privateFileSize(row.file);
  if (size === null) return new Response("Fichier introuvable", { status: 404 });

  const playType = PLAYABLE_TYPES[row.file.split(".").pop()!];
  if (!(new URL(request.url).searchParams.get("ecouter") && playType)) {
    return new Response(streamPrivateFile(row.file, 0, size - 1), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Lecture : Content-Length et les requêtes partielles sont indispensables (Safari, avance rapide).
  const headers = { "Content-Type": playType, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" };
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    // "bytes=-500" désigne les 500 derniers octets.
    const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(streamPrivateFile(row.file, start, end), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(streamPrivateFile(row.file, 0, size - 1), { headers: { ...headers, "Content-Length": String(size) } });
}
