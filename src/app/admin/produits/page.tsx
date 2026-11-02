import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { ImageOff, Plus, Star } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { ProductRowActions } from "@/components/shop/ProductRowActions";
import { db } from "@/db";
import { product } from "@/db/schema";
import { fileFormat, formatBytes, formatPrice, mediaUrl, productTypeLabels } from "@/lib/shop-format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Produits — Swell" };

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminProductsContent />
    </Suspense>
  );
}

async function AdminProductsContent() {
  const admin = await requireAdmin();
  const products = await db.select().from(product).orderBy(desc(product.createdAt));

  return (
    <DashboardShell user={admin} title="Boutique" subtitle="Ajoute, modifie et publie tes VST, drum kits et packs.">
      <Card
        title={`Produits (${products.length})`}
        action={
          <Link
            href="/admin/produits/nouveau"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
          >
            <Plus size={16} /> Nouveau produit
          </Link>
        }
      >
        {products.length === 0 ? (
          <EmptyState>Aucun produit pour l&apos;instant. Crée ton premier VST ou drum kit.</EmptyState>
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
      </Card>
    </DashboardShell>
  );
}
