import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { product } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { PRODUCTS_TAG } from "@/lib/shop";
import {
  deletePrivateFile,
  extensionOf,
  MAX_DOWNLOAD_BYTES,
  openPrivateFile,
  PrivateUploadError,
  savePrivateStream,
} from "@/lib/private-storage";

// Envoi (PUT) et téléchargement (GET) du fichier livré d'un produit, réservés à l'admin.
// Route dédiée plutôt qu'une Server Action : le fichier est écrit en flux, sans limite de 25 Mo.

async function adminOnly() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

async function findProduct(ctx: RouteContext<"/api/admin/products/[id]/file">) {
  const { id } = await ctx.params;
  const [row] = await db.select().from(product).where(eq(product.id, id));
  return row;
}

export async function PUT(request: Request, ctx: RouteContext<"/api/admin/products/[id]/file">) {
  if (!(await adminOnly())) return Response.json({ error: "Accès refusé." }, { status: 403 });
  const row = await findProduct(ctx);
  if (!row) return Response.json({ error: "Produit introuvable." }, { status: 404 });

  const originalName = decodeURIComponent(request.headers.get("x-file-name") ?? "").replace(/[/\\]/g, "").slice(0, 200);
  const ext = extensionOf(originalName);
  if (!ext) return Response.json({ error: "Format accepté : ZIP, RAR, 7Z, DMG, PKG, EXE, MSI, WAV ou MP3." }, { status: 400 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_DOWNLOAD_BYTES) return Response.json({ error: "Fichier trop lourd (2 Go max)." }, { status: 413 });
  if (!request.body) return Response.json({ error: "Fichier manquant." }, { status: 400 });

  try {
    const { name, size } = await savePrivateStream(request.body, ext);
    await db
      .update(product)
      .set({ downloadFile: name, downloadName: originalName, downloadSize: size })
      .where(eq(product.id, row.id));
    await deletePrivateFile(row.downloadFile);
    revalidateTag(PRODUCTS_TAG, { expire: 0 });
    return Response.json({ ok: true, name: originalName, size });
  } catch (e) {
    if (e instanceof PrivateUploadError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/products/[id]/file">) {
  if (!(await adminOnly())) return new Response("Accès refusé", { status: 403 });
  const row = await findProduct(ctx);
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
