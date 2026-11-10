import { eq } from "drizzle-orm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { hasActiveTrial } from "@/lib/licenses";
import { hasPurchased } from "@/lib/orders";
import { openPrivateFile } from "@/lib/private-storage";
import { getCurrentUser, hasConfirmedEmail } from "@/lib/session";

// Téléchargement du fichier d'un produit : le droit est vérifié à chaque demande.
// ?os=mac ou ?os=win : l'installateur de ce système s'il existe, sinon le fichier principal.
export async function GET(request: Request, ctx: RouteContext<"/api/downloads/[productId]">) {
  const user = await getCurrentUser();
  if (!user) {
    // Adresse relative : derrière Nginx, request.url pointe vers le serveur interne.
    return new Response(null, { status: 307, headers: { Location: "/connexion?next=%2Fcompte" } });
  }

  if (!hasConfirmedEmail(user)) return new Response("Confirme ton adresse email pour télécharger.", { status: 403 });

  const { productId } = await ctx.params;
  // Acheté, ou essai en cours (démo d'un VST).
  if (user.role !== "admin" && !(await hasPurchased(user.id, productId)) && !(await hasActiveTrial(user.id, productId))) {
    return new Response("Accès refusé", { status: 403 });
  }

  const [row] = await db.select().from(product).where(eq(product.id, productId));
  if (!row) return new Response("Fichier introuvable", { status: 404 });
  const os = new URL(request.url).searchParams.get("os");
  const choice =
    os === "mac" && row.installerMacFile
      ? { file: row.installerMacFile, name: row.installerMacName }
      : os === "win" && row.installerWinFile
        ? { file: row.installerWinFile, name: row.installerWinName }
        : { file: row.downloadFile, name: row.downloadName };
  const file = choice.file ? await openPrivateFile(choice.file) : null;
  if (!file) return new Response("Fichier introuvable", { status: 404 });

  return new Response(file.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(choice.name ?? choice.file!)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
