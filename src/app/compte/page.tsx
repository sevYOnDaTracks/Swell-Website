import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { CalendarPlus, CheckCircle2, Clock, Download } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { BookingStatusBadge } from "@/components/booking/BookingStatus";
import { CancelMyBookingButton } from "@/components/booking/BookingActions";
import { db } from "@/db";
import { booking } from "@/db/schema";
import { bookingServices } from "@/lib/content";
import { formatDate, getService, parisNow } from "@/lib/booking";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Mon espace — Swell" };

export default function AccountPage({ searchParams }: PageProps<"/compte">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AccountContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountContent({ searchParams }: Pick<PageProps<"/compte">, "searchParams">) {
  const user = await requireUser();
  const { reservation } = await searchParams;
  const today = parisNow().date;
  const firstName = user.name.split(" ")[0];

  const [upcoming, past] = await Promise.all([
    db
      .select()
      .from(booking)
      .where(and(eq(booking.userId, user.id), gte(booking.date, today)))
      .orderBy(asc(booking.date), asc(booking.startTime)),
    db
      .select()
      .from(booking)
      .where(and(eq(booking.userId, user.id), lt(booking.date, today)))
      .orderBy(desc(booking.date))
      .limit(5),
  ]);
  const activeCount = upcoming.filter((b) => b.status !== "cancelled").length;

  return (
    <DashboardShell user={user} title={`Salut ${firstName} 👋`} subtitle="Retrouve ici tes réservations et tes achats.">
      {reservation === "ok" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0" /> Réservation envoyée ! Elle passera en « Confirmée » dès que
          Swell l&apos;aura validée.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Mes réservations" action={<span className="text-xs text-muted">{activeCount} à venir</span>}>
            {upcoming.length === 0 ? (
              <EmptyState>
                Aucune session réservée pour le moment.{" "}
                <Link href="/reserver" className="text-foreground underline underline-offset-4">
                  Réserver
                </Link>
              </EmptyState>
            ) : (
              <ul className="divide-y divide-white/5">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium">{getService(b.service)?.label ?? b.service}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                        <Clock size={13} />
                        <span className="capitalize">{formatDate(b.date)}</span> · {b.startTime} – {b.endTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <BookingStatusBadge status={b.status} />
                      {b.status !== "cancelled" && <CancelMyBookingButton id={b.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {past.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted hover:text-foreground">Sessions passées</summary>
                <ul className="mt-2 space-y-1 text-muted">
                  {past.map((b) => (
                    <li key={b.id}>
                      <span className="capitalize">{formatDate(b.date)}</span> · {getService(b.service)?.label ?? b.service}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>

          <Card
            title="Mes achats"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Download size={14} /> VST & Drum kits
              </span>
            }
          >
            <EmptyState>
              Tes VST et drum kits achetés apparaîtront ici.{" "}
              <Link href="/#boutique" className="text-foreground underline underline-offset-4">
                Voir la boutique
              </Link>
            </EmptyState>
          </Card>
        </div>

        <Card title="Réserver une session">
          <ul className="space-y-2">
            {bookingServices.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/reserver?service=${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-background/40 px-3 py-3 text-sm transition-colors hover:border-white/25"
                >
                  {s.label}
                  <CalendarPlus size={16} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardShell>
  );
}
