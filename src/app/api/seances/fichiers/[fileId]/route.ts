import { eq } from "drizzle-orm";
import { db } from "@/db";
import { booking, sessionFile } from "@/db/schema";
import { openPrivateFile } from "@/lib/private-storage";
import { getCurrentUser } from "@/lib/session";

// Téléchargement d'un fichier de séance : seul le client de la séance (ou l'admin) y a accès.
export async function GET(_request: Request, ctx: RouteContext<"/api/seances/fichiers/[fileId]">) {
  const user = await getCurrentUser();
  if (!user) {
    // Adresse relative : derrière Nginx, request.url pointe vers le serveur interne.
    return new Response(null, { status: 307, headers: { Location: "/connexion?next=%2Fcompte%3Fonglet%3Darchives" } });
  }

  const { fileId } = await ctx.params;
  const [row] = await db
    .select({ file: sessionFile.file, name: sessionFile.name, ownerId: booking.userId })
    .from(sessionFile)
    .innerJoin(booking, eq(sessionFile.bookingId, booking.id))
    .where(eq(sessionFile.id, fileId));
  // Même réponse que pour un fichier inexistant : on ne révèle rien des séances des autres.
  if (!row || (row.ownerId !== user.id && user.role !== "admin")) return new Response("Fichier introuvable", { status: 404 });

  const file = await openPrivateFile(row.file);
  if (!file) return new Response("Fichier introuvable", { status: 404 });

  return new Response(file.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
