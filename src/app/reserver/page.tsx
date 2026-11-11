import { Suspense } from "react";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { BookingForm } from "@/components/booking/BookingForm";
import { getBookableServices } from "@/lib/offers";
import { getBookableDays } from "@/lib/booking";
import { getPaymentOptions } from "@/lib/orders";
import { METHOD_ORDER } from "@/lib/payments";
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
  const [days, services] = await Promise.all([getBookableDays(), getBookableServices()]);
  const payments = getPaymentOptions();
  const initialService = services.some((s) => s.id === service) ? String(service) : undefined;

  return (
    <DashboardShell user={user} title="Réserver une session" subtitle="Choisis ton service, ta date et ton créneau.">
      {services.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center text-sm text-muted">
          Aucun service n&apos;est réservable pour le moment.
        </p>
      ) : (
        <BookingForm
          services={services.map((s) => ({ id: s.id, label: s.name, duration: s.durationMinutes, description: s.description, priceCents: s.priceCents }))}
          methods={METHOD_ORDER.filter((m) => payments[m])}
          days={days}
          initialService={initialService}
        />
      )}
    </DashboardShell>
  );
}
