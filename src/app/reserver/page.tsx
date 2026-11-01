import { Suspense } from "react";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { BookingForm } from "@/components/booking/BookingForm";
import { bookingServices } from "@/lib/content";
import { getBookableDays } from "@/lib/booking";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Réserver — Swell" };

export default function BookingPage({ searchParams }: PageProps<"/reserver">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <BookingContent searchParams={searchParams} />
    </Suspense>
  );
}

async function BookingContent({ searchParams }: Pick<PageProps<"/reserver">, "searchParams">) {
  const user = await requireUser();
  const { service } = await searchParams;
  const days = await getBookableDays();
  const initialService = bookingServices.some((s) => s.id === service) ? String(service) : undefined;

  return (
    <DashboardShell user={user} title="Réserver une session" subtitle="Choisis ton service, ta date et ton créneau.">
      <BookingForm services={[...bookingServices]} days={days} initialService={initialService} />
    </DashboardShell>
  );
}
