import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { ProductForm } from "@/components/shop/ProductForm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Modifier un produit — Swell" };

export default function EditProductPage({ params, searchParams }: PageProps<"/admin/produits/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EditProductContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditProductContent({ params, searchParams }: PageProps<"/admin/produits/[id]">) {
  const admin = await requireAdmin();
  const [{ id }, { nouveau }] = await Promise.all([params, searchParams]);
  const [row] = await db.select().from(product).where(eq(product.id, id));
  if (!row) notFound();

  return (
    <DashboardShell user={admin} title={row.name} subtitle="Modifier le produit">
      {nouveau && (
        <p className="mb-6 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 text-sm">
          Produit créé. Ajoute maintenant le fichier à livrer (ZIP, installateur…) dans le bloc à droite.
        </p>
      )}
      <ProductForm
        product={{
          id: row.id,
          name: row.name,
          slug: row.slug,
          type: row.type,
          priceCents: row.priceCents,
          shortDescription: row.shortDescription,
          description: row.description,
          genres: row.genres,
          platforms: row.platforms,
          formats: row.formats,
          coverFile: row.coverFile,
          previewFile: row.previewFile,
          downloadFile: row.downloadFile,
          downloadName: row.downloadName,
          downloadSize: row.downloadSize,
          published: row.published,
          featured: row.featured,
        }}
      />
    </DashboardShell>
  );
}
