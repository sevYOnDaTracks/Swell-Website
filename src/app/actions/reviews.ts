"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { product, review } from "@/db/schema";
import { getReviewEligibility } from "@/lib/reviews";
import { getCurrentUser, requireAdmin } from "@/lib/session";

type ReviewInput = { productId: string; rating: number; title: string; body: string; daw: string; os: string };

const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+\n/g, "\n").trim().slice(0, max);

/** Crée ou modifie l'avis du client connecté (un seul par produit). */
export async function saveReview(input: ReviewInput): Promise<{ error: string } | { ok: true }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connecte-toi pour laisser un avis." };

  const [row] = await db.select({ id: product.id }).from(product).where(and(eq(product.id, String(input.productId)), eq(product.published, true)));
  if (!row) return { error: "Produit introuvable." };

  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choisis une note de 1 à 5 étoiles." };
  const body = clean(input.body, 3000);
  if (body.length < 20) return { error: "Écris au moins quelques phrases (20 caractères minimum)." };
  const title = clean(input.title, 120);
  const daw = clean(input.daw, 40) || null;
  const os = clean(input.os, 40) || null;

  const eligibility = await getReviewEligibility(user.id, row.id);
  if (!eligibility.verification) {
    return {
      error:
        eligibility.reason === "trial_too_recent"
          ? "Laisse-toi encore quelques jours d'essai avant de donner ton avis."
          : "Les avis sont réservés aux clients et aux testeurs de la démo.",
    };
  }

  await db
    .insert(review)
    .values({ productId: row.id, userId: user.id, rating, title, body, daw, os, verification: eligibility.verification })
    .onConflictDoUpdate({
      target: [review.userId, review.productId],
      // Un avis modifié repasse en ligne seulement s'il n'avait pas été masqué par la modération.
      set: { rating, title, body, daw, os, verification: eligibility.verification, updatedAt: new Date() },
    });
  refresh();
  return { ok: true };
}

export async function deleteMyReview(productId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.delete(review).where(and(eq(review.userId, user.id), eq(review.productId, String(productId))));
  refresh();
}

// --- Admin -------------------------------------------------------------------

export async function replyToReview(id: string, reply: string) {
  await requireAdmin();
  const text = clean(reply, 2000);
  await db
    .update(review)
    .set({ reply: text || null, repliedAt: text ? new Date() : null })
    .where(eq(review.id, id));
  refresh();
}

/** Masquer un avis : uniquement pour une raison de modération, notée pour garder une trace. */
export async function setReviewHidden(id: string, hidden: boolean, note: string) {
  await requireAdmin();
  if (hidden && !clean(note, 300)) return { error: "Indique la raison (insulte, spam, hors sujet…)." };
  await db
    .update(review)
    .set({ status: hidden ? "hidden" : "published", moderationNote: hidden ? clean(note, 300) : null })
    .where(eq(review.id, id));
  refresh();
  return { ok: true };
}
