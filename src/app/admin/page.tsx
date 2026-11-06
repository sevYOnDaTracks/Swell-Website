import { Suspense } from "react";
import { and, asc, count, eq, gte, ne } from "drizzle-orm";
import { CalendarCheck, Hourglass, ShoppingBag, Users } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { BookingStatusBadge } from "@/components/booking/BookingStatus";
import { AdminBookingActions } from "@/components/booking/BookingActions";
import { db } from "@/db";
import { booking, shopOrder, user as userTable } from "@/db/schema";
import { formatDate, parisNow } from "@/lib/booking";
import { getServiceNames } from "@/lib/offers";
import { formatPhone, phoneHref } from "@/lib/phone";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Admin — Swell" };

export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
  const admin = await requireAdmin();
  const today = parisNow().date;

  const [users, bookings, serviceName, [sales]] = await Promise.all([
    db.select({ role: userTable.role }).from(userTable),
    db
      .select({
        id: booking.id,
        service: booking.service,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        notes: booking.notes,
        proposedDate: booking.proposedDate,
        proposedStartTime: booking.proposedStartTime,
        proposedEndTime: booking.proposedEndTime,
        clientName: userTable.name,
        clientEmail: userTable.email,
        clientPhone: userTable.phone,
      })
      .from(booking)
      .innerJoin(userTable, eq(booking.userId, userTable.id))
      .where(and(gte(booking.date, today), ne(booking.status, "cancelled")))
      .orderBy(asc(booking.date), asc(booking.startTime)),
    getServiceNames(),
    db.select({ total: count() }).from(shopOrder).where(and(eq(shopOrder.status, "paid"), ne(shopOrder.method, "free"))),
  ]);

  const clients = users.filter((u) => u.role !== "admin");
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const stats = [
    { label: "Clients inscrits", value: clients.length, icon: Users },
    { label: "Sessions à venir", value: bookings.length, icon: CalendarCheck },
    { label: "À confirmer", value: pendingCount, icon: Hourglass },
    { label: "Ventes boutique", value: sales.total, icon: ShoppingBag },
  ];

  return (
    <DashboardShell user={admin} title="Tableau de bord" subtitle="Vue d'ensemble de Swell.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-surface p-5">
            <div className="flex items-center justify-between gap-2 text-muted">
              <span className="text-sm">{label}</span>
              <Icon size={18} className="shrink-0" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <Card title="Prochaines sessions">
          {bookings.length === 0 ? (
            <EmptyState>Aucune session à venir.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/5">
              {bookings.map((b) => (
                <li key={b.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="capitalize">{formatDate(b.date)}</span>
                      <span className="text-muted">·</span>
                      <span className="tabular-nums">
                        {b.startTime} – {b.endTime}
                      </span>
                      <BookingStatusBadge status={b.status} />
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {serviceName(b.service)} — {b.clientName} ({b.clientEmail})
                      {b.clientPhone && (
                        <>
                          {" · "}
                          <a href={phoneHref(b.clientPhone)} className="whitespace-nowrap text-foreground hover:underline">
                            {formatPhone(b.clientPhone)}
                          </a>
                        </>
                      )}
                    </p>
                    {b.notes && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">« {b.notes} »</p>}
                    {b.status === "proposed" && b.proposedDate && (
                      <p className="mt-1 text-sm">
                        Proposé : <span className="capitalize">{formatDate(b.proposedDate)}</span> · {b.proposedStartTime} –{" "}
                        {b.proposedEndTime} <span className="text-muted">— en attente du client</span>
                      </p>
                    )}
                  </div>
                  <AdminBookingActions id={b.id} status={b.status} today={today} />
                </li>
              ))}
            </ul>
          )}
        </Card>

      </div>
    </DashboardShell>
  );
}
