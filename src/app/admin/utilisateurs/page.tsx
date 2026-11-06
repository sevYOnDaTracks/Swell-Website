import { Suspense } from "react";
import { count, desc } from "drizzle-orm";
import { UsersManager } from "@/components/admin/UsersManager";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { db } from "@/db";
import { booking, shopOrder, user } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Utilisateurs — Swell" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function UsersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <UsersContent />
    </Suspense>
  );
}

async function UsersContent() {
  const admin = await requireAdmin();
  const [users, orders, bookings] = await Promise.all([
    db.select().from(user).orderBy(desc(user.createdAt)),
    db.select({ userId: shopOrder.userId, total: count() }).from(shopOrder).groupBy(shopOrder.userId),
    db.select({ userId: booking.userId, total: count() }).from(booking).groupBy(booking.userId),
  ]);
  const ordersBy = new Map(orders.map((o) => [o.userId, o.total]));
  const bookingsBy = new Map(bookings.map((b) => [b.userId, b.total]));

  return (
    <DashboardShell user={admin} title="Utilisateurs" subtitle="Ajoute, modifie, désactive ou supprime les comptes.">
      <UsersManager
        currentUserId={admin.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          image: u.image,
          role: u.role ?? "user",
          banned: !!u.banned,
          emailVerified: u.emailVerified,
          createdLabel: dateFormat.format(u.createdAt),
          orders: ordersBy.get(u.id) ?? 0,
          bookings: bookingsBy.get(u.id) ?? 0,
        }))}
      />
    </DashboardShell>
  );
}
