import Link from "next/link";
import { Suspense } from "react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { ListSearch, Pagination } from "@/components/admin/ListControls";
import { AdminReviewActions } from "@/components/reviews/AdminReviewActions";
import { Stars } from "@/components/reviews/Stars";
import { PAGE_SIZE, readPage, readParam } from "@/lib/admin-list";
import { getAdminReviews, verificationLabels } from "@/lib/reviews";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Avis clients — Swell" };

const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function ReviewsAdminPage({ searchParams }: PageProps<"/admin/avis">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ReviewsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ReviewsContent({ searchParams }: Pick<PageProps<"/admin/avis">, "searchParams">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const { page, offset } = readPage(params);
  const { rows, total } = await getAdminReviews({ q: readParam(params, "q"), status: readParam(params, "etat"), limit: PAGE_SIZE, offset });

  return (
    <DashboardShell
      user={admin}
      title="Avis clients"
      subtitle="Réponds publiquement aux avis. Ne masque un avis que pour insulte, spam, hors sujet ou données personnelles, jamais pour sa note."
    >
      <Card title="Avis" action={<span className="text-xs text-muted">{total} avis</span>}>
        <ListSearch
          basePath="/admin/avis"
          params={params}
          placeholder="Texte, client, email ou produit"
          filters={[
            {
              name: "etat",
              label: "État",
              options: [
                { value: "", label: "Tous" },
                { value: "unanswered", label: "Sans réponse" },
                { value: "published", label: "En ligne" },
                { value: "hidden", label: "Masqués" },
              ],
            },
          ]}
        />
        {rows.length === 0 ? (
          <EmptyState>Aucun avis pour l&apos;instant.</EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {rows.map(({ review: r, userName, userEmail, productName, productSlug }) => (
              <li key={r.id} className="py-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Stars value={r.rating} size={14} />
                  <Link href={`/boutique/${productSlug}#avis`} className="font-medium hover:underline">
                    {productName}
                  </Link>
                  <span className="text-muted">
                    {userName} · {userEmail} · {date.format(r.createdAt)} · {verificationLabels[r.verification]}
                    {(r.daw || r.os) && ` · ${[r.daw, r.os].filter(Boolean).join(" / ")}`}
                  </span>
                  {r.status === "hidden" && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">Masqué : {r.moderationNote}</span>
                  )}
                </div>
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/85">{r.body}</p>
                <AdminReviewActions id={r.id} reply={r.reply} hidden={r.status === "hidden"} />
              </li>
            ))}
          </ul>
        )}
        <Pagination basePath="/admin/avis" params={params} page={page} total={total} />
      </Card>
    </DashboardShell>
  );
}
