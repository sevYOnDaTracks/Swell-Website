import { Suspense } from "react";
import { asc, count, desc, eq } from "drizzle-orm";
import { UsersManager } from "@/components/admin/UsersManager";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { db } from "@/db";
import { booking, product, shopOrder, shopOrderItem, user } from "@/db/schema";
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
  const [users, orders, bookings, products, owned] = await Promise.all([
    db.select().from(user).orderBy(desc(user.createdAt)),
    db.select({ userId: shopOrder.userId, total: count() }).from(shopOrder).groupBy(shopOrder.userId),
    db.select({ userId: booking.userId, total: count() }).from(booking).groupBy(booking.userId),
    db.select({ id: product.id, name: product.name, type: product.type, published: product.published }).from(product).orderBy(asc(product.name)),
    // Produits déjà possédés (commande payée, offerte ou gratuite) : on ne peut pas les offrir une 2e fois.
    db
      .selectDistinct({ userId: shopOrder.userId, productId: shopOrderItem.productId })
      .from(shopOrderItem)
      .innerJoin(shopOrder, eq(shopOrderItem.orderId, shopOrder.id))
      .where(eq(shopOrder.status, "paid")),
  ]);
  const ownedBy = new Map<string, string[]>();
  for (const o of owned) {
    if (o.productId) ownedBy.set(o.userId, [...(ownedBy.get(o.userId) ?? []), o.productId]);
  }
  const ordersBy = new Map(orders.map((o) => [o.userId, o.total]));
  const bookingsBy = new Map(bookings.map((b) => [b.userId, b.total]));

  return (
    <DashboardShell user={admin} title="Utilisateurs" subtitle="Ajoute, modifie, désactive ou supprime les comptes, et offre-leur des produits.">
      <UsersManager
        currentUserId={admin.id}
        products={products}
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
          ownedProductIds: ownedBy.get(u.id) ?? [],
        }))}
      />
    </DashboardShell>
  );
}
