import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { ImageOff, Plus, Star } from "lucide-react";
import { ListSearch, Pagination } from "@/components/admin/ListControls";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { PAGE_SIZE, readPage, readParam } from "@/lib/admin-list";
import { ProductRowActions } from "@/components/shop/ProductRowActions";
import { db } from "@/db";
import { product, productTypes } from "@/db/schema";
import { fileFormat, formatBytes, formatPrice, mediaUrl, productTypeLabels, isOnSale } from "@/lib/shop-format";
import { requireAdmin } from "@/lib/session";
import { getMassSale } from "@/lib/mass-sale";
import { MassSaleCard, type SaleProduct } from "@/components/admin/MassSaleCard";

const saleEnd = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export const metadata = { title: "Produits — Swell" };

/** Promo de masse : réglages, produits concernables (avec leur prix promo encore valable) et état. */
async function massSaleOverview(all: (typeof product.$inferSelect)[]) {
  const sale = await getMassSale();
  const now = Date.now();
  const saleProducts: SaleProduct[] = all
    .filter((p) => p.published && p.priceCents > 0)
    .map((p) => ({ id: p.id, name: p.name, type: p.type, priceCents: p.priceCents, coverFile: p.coverFile, ownSaleCents: isOnSale(p, now) ? p.salePriceCents : null }));
  const starts = sale.startsAt ? new Date(sale.startsAt).getTime() : null;
  const ends = sale.endsAt ? new Date(sale.endsAt).getTime() : null;
  const saleStatus = !sale.enabled
    ? { label: "Désactivée", running: false }
    : ends !== null && ends <= now
      ? { label: "Terminée", running: false }
      : starts !== null && starts > now
        ? { label: `Programmée le ${saleEnd.format(starts)}`, running: false }
        : { label: ends !== null ? `En cours jusqu'au ${saleEnd.format(ends)}` : "En cours", running: true };
  return { sale, saleProducts, saleStatus };
}

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/produits">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminProductsContent({ searchParams }: Pick<PageProps<"/admin/produits">, "searchParams">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const { page, offset } = readPage(params);
  const q = readParam(params, "q").toLowerCase();
  const type = readParam(params, "type");
  const state = readParam(params, "etat");
  const all = await db.select().from(product).orderBy(desc(product.createdAt));
  // Peu de produits : filtrés ici, sans requête par critère.
  const matching = all.filter(
    (p) =>
      (!q || `${p.name} ${p.slug} ${p.genres.join(" ")}`.toLowerCase().includes(q)) &&
      (!type || p.type === type) &&
      (!state || (state === "published" ? p.published : state === "draft" ? !p.published : state === "nofile" ? !p.downloadFile : true)),
  );
  const products = matching.slice(offset, offset + PAGE_SIZE);
  const { sale, saleProducts, saleStatus } = await massSaleOverview(all);

  return (
    <DashboardShell user={admin} title="Boutique" subtitle="Ajoute, modifie et publie tes VST, drum kits et packs.">
      <MassSaleCard sale={sale} products={saleProducts} status={saleStatus} />
      <Card
        title={`Produits (${matching.length})`}
        action={
          <Link
            href="/admin/produits/nouveau"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
          >
            <Plus size={16} /> Nouveau produit
          </Link>
        }
      >
        <ListSearch
          basePath="/admin/produits"
          params={params}
          placeholder="Nom, adresse (slug) ou genre"
          filters={[
            { name: "type", label: "Type", options: [{ value: "", label: "Tous les types" }, ...productTypes.map((t) => ({ value: t, label: productTypeLabels[t] }))] },
            {
              name: "etat",
              label: "État",
              options: [
                { value: "", label: "Tous" },
                { value: "published", label: "Publiés" },
                { value: "draft", label: "Brouillons" },
                { value: "nofile", label: "Sans fichier" },
              ],
            },
          ]}
        />
        {products.length === 0 ? (
          <EmptyState>{all.length > 0 ? "Aucun produit ne correspond à ta recherche." : "Aucun produit pour l'instant. Crée ton premier VST ou drum kit."}</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {p.coverFile ? (
                    <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="56px" unoptimized className="object-cover" />
                  ) : (
                    <ImageOff size={18} className="absolute inset-0 m-auto text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <Link href={`/admin/produits/${p.id}`} className="truncate hover:underline">
                      {p.name}
                    </Link>
                    {p.featured && <Star size={14} className="shrink-0 fill-white" aria-label="Mis en avant" />}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {productTypeLabels[p.type]} · {formatPrice(p.priceCents)}
                    {isOnSale(p) && ` · promo ${formatPrice(p.salePriceCents!)}${p.saleEndsAt ? ` jusqu'au ${saleEnd.format(p.saleEndsAt)}` : ""}`}
                    {p.genres.length > 0 && ` · ${p.genres.join(", ")}`}
                    {p.downloadName ? ` · ${fileFormat(p.downloadName)} ${formatBytes(p.downloadSize ?? 0)}` : " · sans fichier"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    p.published ? "bg-white text-black" : "border border-white/20 text-muted"
                  }`}
                >
                  {p.published ? "Publié" : "Brouillon"}
                </span>
                <ProductRowActions id={p.id} slug={p.slug} published={p.published} />
              </li>
            ))}
          </ul>
        )}
        <Pagination basePath="/admin/produits" params={params} page={page} total={matching.length} />
      </Card>
    </DashboardShell>
  );
}
