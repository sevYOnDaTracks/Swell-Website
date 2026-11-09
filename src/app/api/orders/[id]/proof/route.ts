import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { shopOrder } from "@/db/schema";
import { sendOrderEmails } from "@/lib/order-emails";
import { isMobileMethod } from "@/lib/payments";
import { deleteProof, PROOF_TYPES, saveProof } from "@/lib/proofs";
import { getCurrentUser } from "@/lib/session";
import { UploadError } from "@/lib/storage";

// Le client envoie la capture de son paiement Wave / Orange Money (corps = le fichier, type dans Content-Type).
export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/proof">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Connecte-toi pour envoyer ton justificatif." }, { status: 401 });

  const { id } = await ctx.params;
  const [order] = await db.select().from(shopOrder).where(and(eq(shopOrder.id, id), eq(shopOrder.userId, user.id)));
  if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404 });
  if (order.status !== "pending" || !isMobileMethod(order.method)) {
    return Response.json({ error: "Cette commande n'attend pas de justificatif." }, { status: 400 });
  }

  const ext = PROOF_TYPES[(request.headers.get("content-type") ?? "").split(";")[0].trim()];
  if (!ext) return Response.json({ error: "Envoie une capture en JPG, PNG, WebP ou un PDF." }, { status: 400 });
  if (!request.body) return Response.json({ error: "Fichier manquant." }, { status: 400 });

  try {
    const name = await saveProof(request.body, ext);
    await db.update(shopOrder).set({ proofFile: name, proofSentAt: new Date() }).where(eq(shopOrder.id, order.id));
    await deleteProof(order.proofFile);
    after(() => sendOrderEmails(order.id, "proof"));
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof UploadError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
