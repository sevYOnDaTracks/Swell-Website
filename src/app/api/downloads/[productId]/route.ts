import { eq } from "drizzle-orm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { hasPurchased } from "@/lib/orders";
import { openPrivateFile } from "@/lib/private-storage";
import { getCurrentUser, hasConfirmedEmail } from "@/lib/session";

// Téléchargement du fichier d'un produit : le droit est vérifié à chaque demande.
export async function GET(_request: Request, ctx: RouteContext<"/api/downloads/[productId]">) {
  const user = await getCurrentUser();
  if (!user) {
    // Adresse relative : derrière Nginx, request.url pointe vers le serveur interne.
    return new Response(null, { status: 307, headers: { Location: "/connexion?next=%2Fcompte" } });
  }

  if (!hasConfirmedEmail(user)) return new Response("Confirme ton adresse email pour télécharger.", { status: 403 });

  const { productId } = await ctx.params;
  if (user.role !== "admin" && !(await hasPurchased(user.id, productId))) {
    return new Response("Accès refusé", { status: 403 });
  }

  const [row] = await db.select().from(product).where(eq(product.id, productId));
  const file = row?.downloadFile ? await openPrivateFile(row.downloadFile) : null;
  if (!row || !file) return new Response("Fichier introuvable", { status: 404 });

  return new Response(file.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.downloadName ?? row.downloadFile!)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
