import { Suspense } from "react";
import { Card, DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { PlansEditor, ServicesEditor } from "@/components/offers/OfferEditors";
import { getPlans, getServices } from "@/lib/offers";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Services & tarifs — Swell" };

export default function AdminOffersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminOffersContent />
    </Suspense>
  );
}

async function AdminOffersContent() {
  const admin = await requireAdmin();
  const [services, plans] = await Promise.all([getServices(), getPlans()]);

  return (
    <DashboardShell
      user={admin}
      title="Services & tarifs"
      subtitle="Ce que tu modifies ici s'affiche directement sur l'accueil et la page de réservation."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Services">
          <p className="-mt-2 mb-4 text-sm text-muted">
            Affichés dans la section « Services » de l&apos;accueil. La durée bloque le créneau à la réservation.
          </p>
          <ServicesEditor services={services} />
        </Card>
        <Card title="Tarifs">
          <p className="-mt-2 mb-4 text-sm text-muted">Les formules de la section « Tarifs » de l&apos;accueil.</p>
          <PlansEditor plans={plans} services={services} />
        </Card>
      </div>
    </DashboardShell>
  );
}
