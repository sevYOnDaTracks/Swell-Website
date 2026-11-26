import { eq } from "drizzle-orm";
import { db } from "@/db";
import { supportMessage, supportTicket } from "@/db/schema";
import { openProof, PROOF_CONTENT_TYPES } from "@/lib/proofs";
import { getCurrentUser } from "@/lib/session";

// Pièce jointe d'un message du support : visible par l'admin, le client de la demande,
// ou avec le lien secret de la demande (?t=...).
export async function GET(request: Request, ctx: RouteContext<"/api/support/attachments/[messageId]">) {
  const { messageId } = await ctx.params;
  const [row] = await db
    .select({ file: supportMessage.attachment, userId: supportTicket.userId, token: supportTicket.token })
    .from(supportMessage)
    .innerJoin(supportTicket, eq(supportMessage.ticketId, supportTicket.id))
    .where(eq(supportMessage.id, messageId));
  if (!row?.file) return new Response("Fichier introuvable", { status: 404 });

  const user = await getCurrentUser();
  const token = new URL(request.url).searchParams.get("t");
  const allowed = user?.role === "admin" || (!!user && user.id === row.userId) || (!!token && token === row.token);
  if (!allowed) return new Response("Accès refusé", { status: 403 });

  const file = await openProof(row.file);
  if (!file) return new Response("Fichier introuvable", { status: 404 });
  return new Response(file.stream, {
    headers: {
      "Content-Type": PROOF_CONTENT_TYPES[file.ext] ?? "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
