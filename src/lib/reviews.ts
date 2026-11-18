import "server-only";
import { and, avg, count, desc, eq, gte, inArray, isNotNull, isNull, like, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { license, product, review, reviewRequest, shopOrder, shopOrderItem, user, type ReviewVerification } from "@/db/schema";

// Avis clients.
//
// Qui peut noter un produit :
// - un acheteur (commande payée)            → « Achat vérifié »
// - un client à qui le produit a été offert → « Produit offert » (mention obligatoire)
// - un testeur de la démo d'un VST, après TRIAL_REVIEW_DELAY_DAYS jours d'essai → « A testé la démo »
// Les avis sont publiés tout de suite. L'admin peut masquer un avis pour une raison de modération
// (insulte, spam, hors sujet, données personnelles), jamais parce qu'il est négatif, et y répondre.

export const TRIAL_REVIEW_DELAY_DAYS = 3;
const DAY = 24 * 60 * 60 * 1000;

export const verificationLabels: Record<ReviewVerification, string> = {
  purchase: "Achat vérifié",
  gift: "Produit offert",
  trial: "A testé la démo",
};

/** Ce que ce client peut faire sur ce produit : la vérification qu'il aurait, ou la raison du refus. */
export async function getReviewEligibility(
  userId: string,
  productId: string,
): Promise<{ verification: ReviewVerification } | { verification: null; reason: "none" | "trial_too_recent"; availableAt?: Date }> {
  const orders = await db
    .select({ method: shopOrder.method })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .where(and(eq(shopOrder.userId, userId), eq(shopOrderItem.productId, productId), eq(shopOrder.status, "paid")));
  if (orders.some((o) => o.method !== "gift")) return { verification: "purchase" };
  if (orders.length > 0) return { verification: "gift" };

  const [trial] = await db
    .select({ startedAt: license.trialStartedAt })
    .from(license)
    .where(and(eq(license.userId, userId), eq(license.productId, productId), isNotNull(license.trialStartedAt)))
    .limit(1);
  if (trial?.startedAt) {
    const availableAt = new Date(trial.startedAt.getTime() + TRIAL_REVIEW_DELAY_DAYS * DAY);
    if (availableAt <= new Date()) return { verification: "trial" };
    return { verification: null, reason: "trial_too_recent", availableAt };
  }
  return { verification: null, reason: "none" };
}

/** Note moyenne et nombre d'avis publiés d'un produit. */
export async function getReviewSummary(productId: string) {
  const [row] = await db
    .select({ total: count(), average: avg(review.rating) })
    .from(review)
    .where(and(eq(review.productId, productId), eq(review.status, "published")));
  const distribution = await db
    .select({ rating: review.rating, total: count() })
    .from(review)
    .where(and(eq(review.productId, productId), eq(review.status, "published")))
    .groupBy(review.rating);
  return {
    total: row.total,
    average: row.average ? Math.round(Number(row.average) * 10) / 10 : null,
    distribution: [5, 4, 3, 2, 1].map((r) => ({ rating: r, total: distribution.find((d) => d.rating === r)?.total ?? 0 })),
  };
}

/** Notes moyennes de plusieurs produits d'un coup (cartes de la boutique). */
export async function getRatingsFor(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, { average: number; total: number }>();
  const rows = await db
    .select({ productId: review.productId, total: count(), average: avg(review.rating) })
    .from(review)
    .where(and(inArray(review.productId, productIds), eq(review.status, "published")))
    .groupBy(review.productId);
  return new Map(rows.map((r) => [r.productId, { average: Math.round(Number(r.average) * 10) / 10, total: r.total }]));
}

/** Avis publiés d'un produit, les plus récents d'abord. Seul le prénom du client est affiché. */
export async function getProductReviews(productId: string) {
  const rows = await db
    .select({
      id: review.id,
      userId: review.userId,
      rating: review.rating,
      title: review.title,
      body: review.body,
      daw: review.daw,
      os: review.os,
      verification: review.verification,
      reply: review.reply,
      repliedAt: review.repliedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      name: user.name,
    })
    .from(review)
    .innerJoin(user, eq(review.userId, user.id))
    .where(and(eq(review.productId, productId), eq(review.status, "published")))
    .orderBy(desc(review.createdAt));
  return rows.map(({ name, ...r }) => ({ ...r, author: displayName(name) }));
}

export async function getMyReview(userId: string, productId: string) {
  const [row] = await db
    .select()
    .from(review)
    .where(and(eq(review.userId, userId), eq(review.productId, productId)));
  return row ?? null;
}

/** « Olivier B. » : prénom et initiale du nom, pour ne pas exposer le nom complet. */
export function displayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// --- Admin -------------------------------------------------------------------

export async function getAdminReviews(filters: { q?: string; status?: string; limit: number; offset: number }) {
  const q = filters.q?.trim();
  const pattern = q ? `%${q}%` : null;
  const where = and(
    pattern ? or(like(review.body, pattern), like(review.title, pattern), like(user.name, pattern), like(user.email, pattern), like(product.name, pattern)) : undefined,
    filters.status === "hidden" ? eq(review.status, "hidden") : undefined,
    filters.status === "published" ? eq(review.status, "published") : undefined,
    filters.status === "unanswered" ? and(eq(review.status, "published"), isNull(review.reply)) : undefined,
  );
  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(review).innerJoin(user, eq(review.userId, user.id)).innerJoin(product, eq(review.productId, product.id)).where(where),
    db
      .select({ review, userName: user.name, userEmail: user.email, productName: product.name, productSlug: product.slug })
      .from(review)
      .innerJoin(user, eq(review.userId, user.id))
      .innerJoin(product, eq(review.productId, product.id))
      .where(where)
      .orderBy(desc(review.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
  ]);
  return { total, rows };
}

// --- Emails de demande d'avis -----------------------------------------------

export const PURCHASE_REVIEW_DELAY_DAYS = 10;
export const TRIAL_REQUEST_DELAY_DAYS = 5;
// Au-delà, on ne relance plus (évite d'écrire à d'anciens clients lors de la mise en route).
const REQUEST_WINDOW_DAYS = 30;

/** Clients et produits à qui demander un avis : achat payé il y a 10 jours ou démo lancée il y a 5 jours, sans avis ni email déjà envoyé. */
export async function getDueReviewRequests() {
  const now = Date.now();
  const purchases = await db
    .selectDistinct({ userId: shopOrder.userId, productId: product.id, productName: product.name, slug: product.slug, email: user.email, name: user.name })
    .from(shopOrderItem)
    .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
    .innerJoin(product, eq(shopOrderItem.productId, product.id))
    .innerJoin(user, eq(shopOrder.userId, user.id))
    .where(
      and(
        eq(shopOrder.status, "paid"),
        eq(product.published, true),
        lte(shopOrder.paidAt, new Date(now - PURCHASE_REVIEW_DELAY_DAYS * DAY)),
        gte(shopOrder.paidAt, new Date(now - (PURCHASE_REVIEW_DELAY_DAYS + REQUEST_WINDOW_DAYS) * DAY)),
      ),
    );
  const trials = await db
    .selectDistinct({ userId: license.userId, productId: product.id, productName: product.name, slug: product.slug, email: user.email, name: user.name })
    .from(license)
    .innerJoin(product, eq(license.productId, product.id))
    .innerJoin(user, eq(license.userId, user.id))
    .where(
      and(
        eq(product.published, true),
        lte(license.trialStartedAt, new Date(now - TRIAL_REQUEST_DELAY_DAYS * DAY)),
        gte(license.trialStartedAt, new Date(now - (TRIAL_REQUEST_DELAY_DAYS + REQUEST_WINDOW_DAYS) * DAY)),
      ),
    );

  const candidates = new Map<string, (typeof purchases)[number] & { kind: "purchase" | "trial" }>();
  for (const t of trials) candidates.set(`${t.userId}:${t.productId}`, { ...t, kind: "trial" });
  for (const p of purchases) candidates.set(`${p.userId}:${p.productId}`, { ...p, kind: "purchase" }); // l'achat l'emporte
  if (candidates.size === 0) return [];

  const userIds = [...new Set([...candidates.values()].map((c) => c.userId))];
  const [sent, reviewed] = await Promise.all([
    db.select({ userId: reviewRequest.userId, productId: reviewRequest.productId }).from(reviewRequest).where(inArray(reviewRequest.userId, userIds)),
    db.select({ userId: review.userId, productId: review.productId }).from(review).where(inArray(review.userId, userIds)),
  ]);
  for (const r of [...sent, ...reviewed]) candidates.delete(`${r.userId}:${r.productId}`);
  return [...candidates.values()];
}
