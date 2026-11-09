import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shopOrder } from "@/db/schema";
import { openProof, PROOF_CONTENT_TYPES } from "@/lib/proofs";
import { getCurrentUser } from "@/lib/session";

// Justificatif de paiement d'une commande, affiché à l'admin seulement.
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/orders/[id]/proof">) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Accès refusé", { status: 403 });
  const { id } = await ctx.params;
  const [order] = await db.select({ proofFile: shopOrder.proofFile, reference: shopOrder.reference }).from(shopOrder).where(eq(shopOrder.id, id));
  const file = order?.proofFile ? await openProof(order.proofFile) : null;
  if (!order || !file) return new Response("Justificatif introuvable", { status: 404 });
  return new Response(file.stream, {
    headers: {
      "Content-Type": PROOF_CONTENT_TYPES[file.ext] ?? "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `inline; filename="justificatif-${order.reference}.${file.ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
