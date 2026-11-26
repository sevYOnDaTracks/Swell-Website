import { Suspense } from "react";
import { asc, eq, ne, and } from "drizzle-orm";
import { HomeAdmin } from "@/components/admin/HomeAdmin";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { db } from "@/db";
import { product } from "@/db/schema";
import { getHomeSettings } from "@/lib/home";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Accueil et annonces — Swell" };

export default function HomeAdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <HomeAdminContent />
    </Suspense>
  );
}

async function HomeAdminContent() {
  const admin = await requireAdmin();
  const [settings, products] = await Promise.all([
    getHomeSettings(),
    db
      .select({ id: product.id, name: product.name, slug: product.slug, coverFile: product.coverFile, type: product.type })
      .from(product)
      .where(and(eq(product.published, true), ne(product.type, "instrumental")))
      .orderBy(asc(product.name)),
  ]);
  return (
    <DashboardShell user={admin} title="Accueil et annonces" subtitle="Bannière promo, annonces en grand et nouveautés de swell-audio.fr.">
      <HomeAdmin settings={settings} products={products} />
    </DashboardShell>
  );
}
