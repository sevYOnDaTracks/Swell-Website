import { Suspense } from "react";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { ProductForm } from "@/components/shop/ProductForm";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Nouveau produit — Swell" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <NewProductContent />
    </Suspense>
  );
}

async function NewProductContent() {
  const admin = await requireAdmin();
  return (
    <DashboardShell user={admin} title="Nouveau produit">
      <ProductForm />
    </DashboardShell>
  );
}
