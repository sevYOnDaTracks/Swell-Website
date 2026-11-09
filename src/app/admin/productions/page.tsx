import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { Disc3, Plus } from "lucide-react";
import { ListSearch, Pagination } from "@/components/admin/ListControls";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { PAGE_SIZE, readPage, readParam } from "@/lib/admin-list";
import { ProductionRowActions } from "@/components/productions/ProductionRowActions";
import { db } from "@/db";
import { production } from "@/db/schema";
import { platformName } from "@/lib/listen-link";
import { HOME_PRODUCTIONS_LIMIT } from "@/lib/productions";
import { mediaUrl } from "@/lib/shop-format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Productions — Swell" };

export default function AdminProductionsPage({ searchParams }: PageProps<"/admin/productions">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminProductionsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminProductionsContent({ searchParams }: Pick<PageProps<"/admin/productions">, "searchParams">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const { page, offset } = readPage(params);
  const q = readParam(params, "q").toLowerCase();
  const rows = await db.select().from(production).orderBy(asc(production.position));
  // « Sur l'accueil » et l'ordre (monter / descendre) se calculent sur la liste complète, avant la recherche.
  let shown = 0;
  const annotated = rows.map((p, i) => {
    const onHome = p.published && shown < HOME_PRODUCTIONS_LIMIT;
    if (p.published) shown++;
    return { p, i, onHome };
  });
  const matching = annotated.filter(({ p }) => !q || `${p.title} ${p.artist} ${p.role}`.toLowerCase().includes(q));
  const pageRows = matching.slice(offset, offset + PAGE_SIZE);

  return (
    <DashboardShell
      user={admin}
      title="Dernières productions"
      subtitle={`Les titres sur lesquels tu as travaillé, affichés sur l'accueil (les ${HOME_PRODUCTIONS_LIMIT} premiers visibles).`}
    >
      <Card
        title={`Productions (${rows.length})`}
        action={
          <Link
            href="/admin/productions/nouveau"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
          >
            <Plus size={16} /> Ajouter
          </Link>
        }
      >
        <ListSearch basePath="/admin/productions" params={params} placeholder="Titre, artiste ou rôle" />
        {pageRows.length === 0 && rows.length > 0 ? (
          <EmptyState>Aucune production ne correspond à ta recherche.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>Aucune production pour l&apos;instant. La section est masquée sur l&apos;accueil tant qu&apos;elle est vide.</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {pageRows.map(({ p, i, onHome }) => {
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                    {p.coverFile ? (
                      <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="56px" unoptimized className="object-cover" />
                    ) : (
                      <Disc3 size={20} className="absolute inset-0 m-auto text-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/productions/${p.id}`} className="block truncate font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {[p.artist, p.role, p.audioFile && "extrait", p.link && platformName(p.link)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      onHome ? "bg-white text-black" : "border border-white/20 text-muted"
                    }`}
                  >
                    {onHome ? "Sur l'accueil" : p.published ? "Hors top 6" : "Masquée"}
                  </span>
                  <ProductionRowActions id={p.id} published={p.published} isFirst={i === 0} isLast={i === rows.length - 1} />
                </li>
              );
            })}
          </ul>
        )}
        <Pagination basePath="/admin/productions" params={params} page={page} total={matching.length} />
      </Card>
    </DashboardShell>
  );
}
