import { eq } from "drizzle-orm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { notifyProductUpdate } from "@/lib/update-notifications";

// Annonce la nouvelle version d'un produit sans passer par l'upload de l'admin
// (fichier remplacé directement sur le serveur). Appelée par scripts/notify-update.mts
// avec l'en-tête Authorization: Bearer <CRON_SECRET>.
// Corps JSON : { slug, version?, dryRun?, force? }.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Accès refusé", { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { slug?: string; version?: string; dryRun?: boolean; force?: boolean };
  if (!body.slug) return Response.json({ error: "slug manquant" }, { status: 400 });
  const [p] = await db.select({ id: product.id }).from(product).where(eq(product.slug, body.slug));
  if (!p) return Response.json({ error: `Produit « ${body.slug} » introuvable` }, { status: 404 });

  try {
    const result = await notifyProductUpdate(p.id, {
      version: body.version || undefined,
      dryRun: Boolean(body.dryRun),
      force: Boolean(body.force),
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
