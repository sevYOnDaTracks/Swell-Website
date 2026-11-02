import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { ProductForm } from "@/components/shop/ProductForm";
import { db } from "@/db";
import { product } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Modifier un produit — Swell" };

export default function EditProductPage({ params }: PageProps<"/admin/produits/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EditProductContent params={params} />
    </Suspense>
  );
}

async function EditProductContent({ params }: Pick<PageProps<"/admin/produits/[id]">, "params">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [row] = await db.select().from(product).where(eq(product.id, id));
  if (!row) notFound();

  return (
    <DashboardShell user={admin} title={row.name} subtitle="Modifier le produit">
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
          coverFile: row.coverFile,
          previewFile: row.previewFile,
          published: row.published,
          featured: row.featured,
        }}
      />
    </DashboardShell>
  );
}
