import Link from "next/link";
import { BadgeCheck, MessageSquareReply } from "lucide-react";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { Stars } from "@/components/reviews/Stars";
import { getMyReview, getProductReviews, getReviewEligibility, getReviewSummary, verificationLabels } from "@/lib/reviews";
import { getCurrentUser } from "@/lib/session";
import { SHOP_URL } from "@/lib/sites";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

type Props = { productId: string; productName: string; slug: string; path: string };

/** Note moyenne sous le titre de la fiche, qui renvoie vers la section des avis. */
export async function RatingSummaryLink({ productId }: { productId: string }) {
  const { total, average } = await getReviewSummary(productId);
  if (!total || average === null) return null;
  return (
    <a href="#avis" className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
      <Stars value={average} />
      <span>
        {average.toLocaleString("fr-FR")} · {total} avis
      </span>
    </a>
  );
}

/** Section « Avis clients » de la fiche produit. */
export async function ProductReviews({ productId, productName, slug, path }: Props) {
  const [summary, reviews, user] = await Promise.all([getReviewSummary(productId), getProductReviews(productId), getCurrentUser()]);
  const [eligibility, mine] = user ? await Promise.all([getReviewEligibility(user.id, productId), getMyReview(user.id, productId)]) : [null, null];
  const canReview = !!eligibility?.verification || !!mine;
  const trialAvailableAt = eligibility && !eligibility.verification && eligibility.reason === "trial_too_recent" ? (eligibility.availableAt ?? null) : null;

  // Données structurées : étoiles dans les résultats Google.
  const jsonLd =
    summary.total > 0 && summary.average !== null
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: productName,
          url: `${SHOP_URL}/boutique/${slug}`,
          aggregateRating: { "@type": "AggregateRating", ratingValue: summary.average, reviewCount: summary.total, bestRating: 5, worstRating: 1 },
          review: reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author },
            datePublished: r.createdAt.toISOString().slice(0, 10),
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            ...(r.title ? { name: r.title } : {}),
            reviewBody: r.body,
          })),
        }
      : null;

  return (
    <section id="avis" className="mt-16 scroll-mt-24 border-t border-white/10 pt-10">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <h2 className="text-2xl font-bold tracking-tight">Avis clients</h2>

      <div className="mt-6 grid gap-10 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          {summary.total > 0 && summary.average !== null ? (
            <div>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold">{summary.average.toLocaleString("fr-FR")}</p>
                <div className="pb-1.5">
                  <Stars value={summary.average} size={18} />
                  <p className="mt-0.5 text-sm text-muted">{summary.total} avis</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {summary.distribution.map((d) => (
                  <li key={d.rating} className="flex items-center gap-2 text-xs text-muted">
                    <span className="w-3 text-right">{d.rating}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(d.total / summary.total) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right">{d.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">Pas encore d&apos;avis sur ce produit.</p>
          )}

          {!user ? (
            <p className="rounded-2xl border border-white/10 bg-surface p-5 text-sm text-muted">
              Tu as acheté ou testé {productName} ?{" "}
              <Link href={`/connexion?next=${encodeURIComponent(`${path}#avis`)}`} className="text-foreground underline">
                Connecte-toi
              </Link>{" "}
              pour donner ton avis.
            </p>
          ) : canReview ? (
            <ReviewForm
              productId={productId}
              existing={
                mine ? { rating: mine.rating, title: mine.title, body: mine.body, daw: mine.daw, os: mine.os, hidden: mine.status === "hidden" } : null
              }
            />
          ) : trialAvailableAt ? (
            <p className="rounded-2xl border border-white/10 bg-surface p-5 text-sm text-muted">
              Prends le temps de tester {productName} : tu pourras donner ton avis à partir du{" "}
              {dateFormat.format(trialAvailableAt)}.
            </p>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-surface p-5 text-sm text-muted">
              Les avis sont réservés aux clients et aux testeurs de la démo.
            </p>
          )}

          <p className="text-xs leading-relaxed text-muted">
            Avis vérifiés : seuls les clients ayant acheté le produit, l&apos;ayant reçu en cadeau ou ayant testé sa démo peuvent le
            noter, et chaque avis indique lequel. Aucun avis n&apos;est rémunéré. Les avis ne sont jamais retirés pour leur note, seulement en
            cas de propos injurieux, de spam ou de contenu hors sujet.
          </p>
        </aside>

        <ul className="space-y-6">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-white/5 pb-6 last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars value={r.rating} />
                {r.title && <p className="font-semibold">{r.title}</p>}
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className="text-foreground/90">{r.author}</span>
                <span>·</span>
                <span>{dateFormat.format(r.createdAt)}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5">
                  <BadgeCheck size={12} className={r.verification === "trial" ? "text-sky-400" : "text-emerald-400"} />
                  {verificationLabels[r.verification]}
                </span>
                {(r.daw || r.os) && <span>{[r.daw, r.os].filter(Boolean).join(" · ")}</span>}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">{r.body}</p>
              {r.reply && (
                <div className="mt-4 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <MessageSquareReply size={14} /> Réponse de Swell
                  </p>
                  <p className="mt-1.5 whitespace-pre-line leading-relaxed text-foreground/85">{r.reply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
