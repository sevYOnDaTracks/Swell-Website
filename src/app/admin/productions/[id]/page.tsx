import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { ProductionForm } from "@/components/productions/ProductionForm";
import { db } from "@/db";
import { production } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Modifier une production — Swell" };

export default function EditProductionPage({ params }: PageProps<"/admin/productions/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EditProductionContent params={params} />
    </Suspense>
  );
}

async function EditProductionContent({ params }: Pick<PageProps<"/admin/productions/[id]">, "params">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [row] = await db.select().from(production).where(eq(production.id, id));
  if (!row) notFound();

  return (
    <DashboardShell user={admin} title={row.title} subtitle="Modifier la production">
      <ProductionForm
        production={{
          id: row.id,
          title: row.title,
          artist: row.artist,
          role: row.role,
          link: row.link,
          coverFile: row.coverFile,
          audioFile: row.audioFile,
          published: row.published,
        }}
      />
    </DashboardShell>
  );
}
