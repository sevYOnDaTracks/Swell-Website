import { Suspense } from "react";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import { CalendarCheck, Hourglass, ShoppingBag, Users } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { BookingStatusBadge } from "@/components/booking/BookingStatus";
import { AdminBookingActions } from "@/components/booking/BookingActions";
import { db } from "@/db";
import { booking, user as userTable } from "@/db/schema";
import { formatDate, getService, parisNow } from "@/lib/booking";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Admin — Swell" };

export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminContent />
    </Suspense>
  );
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

async function AdminContent() {
  const admin = await requireAdmin();
  const today = parisNow().date;

  const [users, bookings] = await Promise.all([
    db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .orderBy(desc(userTable.createdAt)),
    db
      .select({
        id: booking.id,
        service: booking.service,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        notes: booking.notes,
        clientName: userTable.name,
        clientEmail: userTable.email,
      })
      .from(booking)
      .innerJoin(userTable, eq(booking.userId, userTable.id))
      .where(and(gte(booking.date, today), ne(booking.status, "cancelled")))
      .orderBy(asc(booking.date), asc(booking.startTime)),
  ]);

  const clients = users.filter((u) => u.role !== "admin");
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const stats = [
    { label: "Clients inscrits", value: clients.length, icon: Users },
    { label: "Sessions à venir", value: bookings.length, icon: CalendarCheck },
    { label: "À confirmer", value: pendingCount, icon: Hourglass },
    { label: "Ventes boutique", value: 0, icon: ShoppingBag },
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
                      {getService(b.service)?.label ?? b.service} — {b.clientName} ({b.clientEmail})
                    </p>
                    {b.notes && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">« {b.notes} »</p>}
                  </div>
                  <AdminBookingActions id={b.id} status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Utilisateurs">
          {users.length === 0 ? (
            <EmptyState>Aucun utilisateur.</EmptyState>
          ) : (
            <div className="-mx-6 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted">
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-3 font-medium">Nom</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Rôle</th>
                    <th className="px-6 py-3 font-medium">Inscrit le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3 font-medium">{u.name}</td>
                      <td className="px-6 py-3 text-muted">{u.email}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            u.role === "admin" ? "bg-white text-black" : "bg-white/5 text-neutral-300"
                          }`}
                        >
                          {u.role === "admin" ? "Admin" : "Client"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted">{dateFormat.format(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
