import { Suspense } from "react";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { WeeklyHoursForm } from "@/components/booking/WeeklyHoursForm";
import { getWeeklyHours } from "@/lib/booking";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Disponibilités — Swell" };

export default function AvailabilityPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AvailabilityContent />
    </Suspense>
  );
}

async function AvailabilityContent() {
  const admin = await requireAdmin();
  const hours = await getWeeklyHours();

  return (
    <DashboardShell
      user={admin}
      title="Disponibilités"
      subtitle="Les jours et horaires où tes clients peuvent réserver (heure de Paris)."
    >
      <WeeklyHoursForm hours={hours} />
    </DashboardShell>
  );
}
