import { Suspense } from "react";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { ProductionForm } from "@/components/productions/ProductionForm";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Nouvelle production — Swell" };

export default function NewProductionPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <NewProductionContent />
    </Suspense>
  );
}

async function NewProductionContent() {
  const admin = await requireAdmin();
  return (
    <DashboardShell user={admin} title="Nouvelle production">
      <ProductionForm />
    </DashboardShell>
  );
}
