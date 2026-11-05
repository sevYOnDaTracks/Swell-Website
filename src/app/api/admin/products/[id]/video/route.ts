import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { product } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { PRODUCTS_TAG } from "@/lib/shop";
import { deleteUpload, saveVideoStream, UploadError } from "@/lib/storage";

// Envoi (PUT) de la vidéo de présentation d'un produit, réservé à l'admin.
// Route dédiée plutôt qu'une Server Action : le fichier est écrit en flux, sans limite de 25 Mo.
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/products/[id]/video">) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return Response.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await ctx.params;
  const [row] = await db.select().from(product).where(eq(product.id, id));
  if (!row) return Response.json({ error: "Produit introuvable." }, { status: 404 });
  if (!request.body) return Response.json({ error: "Fichier manquant." }, { status: 400 });

  try {
    const name = await saveVideoStream(
      request.body,
      request.headers.get("content-type") ?? "",
      Number(request.headers.get("content-length") ?? 0),
    );
    await db.update(product).set({ videoFile: name, videoUrl: null }).where(eq(product.id, row.id));
    await deleteUpload(row.videoFile);
    revalidateTag(PRODUCTS_TAG, { expire: 0 });
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
