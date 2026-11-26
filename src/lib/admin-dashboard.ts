import "server-only";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { booking, product, review, shopOrder, shopOrderItem, user } from "@/db/schema";
import { getAdminSubscribers } from "./subscriptions";

// Chiffres du tableau de bord de l'admin : ce qui attend une action, l'activité des 30 derniers jours
// comparée aux 30 précédents, le chiffre d'affaires jour par jour, les dernières commandes et les meilleures ventes.

const DAY = 24 * 60 * 60 * 1000;
const parisDay = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

export type DayRevenue = { day: string; shop: number; subscriptions: number; sessions: number };

/** Variation en % entre deux périodes (null si la période précédente est vide). */
const delta = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

export async function getDashboardData(today: string) {
  const now = Date.now();
  const since = new Date(now - 60 * DAY);
  const cut30 = now - 30 * DAY;

  const [orders, sessions, users, subscribers, pendingOrders, reviewsToAnswer, latest] = await Promise.all([
    // Commandes payées (hors gratuites et cadeaux) des 60 derniers jours.
    db
      .select({ id: shopOrder.id, paidAt: shopOrder.paidAt, total: shopOrder.totalCents })
      .from(shopOrder)
      .where(and(eq(shopOrder.status, "paid"), notInArray(shopOrder.method, ["free", "gift"]), gte(shopOrder.paidAt, since))),
    // Séances payées des 60 derniers jours.
    db
      .select({ paidAt: booking.paidAt, price: booking.priceCents })
      .from(booking)
      .where(and(isNotNull(booking.paidAt), gte(booking.paidAt, since))),
    db.select({ createdAt: user.createdAt }).from(user).where(and(ne(user.role, "admin"), gte(user.createdAt, since))),
    getAdminSubscribers(),
    db
      .select({ id: shopOrder.id, proof: shopOrder.proofSentAt })
      .from(shopOrder)
      .where(and(eq(shopOrder.status, "pending"), notInArray(shopOrder.method, ["free", "gift"]))),
    db
      .select({ n: count() })
      .from(review)
      .where(and(eq(review.status, "published"), isNull(review.reply), gte(review.createdAt, new Date(now - 30 * DAY)))),
    db
      .select({
        id: shopOrder.id,
        reference: shopOrder.reference,
        status: shopOrder.status,
        method: shopOrder.method,
        total: shopOrder.totalCents,
        createdAt: shopOrder.createdAt,
        proof: shopOrder.proofSentAt,
        client: user.name,
      })
      .from(shopOrder)
      .innerJoin(user, eq(shopOrder.userId, user.id))
      .where(ne(shopOrder.method, "free"))
      .orderBy(desc(shopOrder.createdAt))
      .limit(6),
  ]);

  // Commandes qui contiennent un pass d'abonnement (pour séparer abonnements et boutique).
  const orderIds = [...orders.map((o) => o.id), ...pendingOrders.map((o) => o.id), ...latest.map((o) => o.id)];
  const subRows = orderIds.length
    ? await db
        .selectDistinct({ orderId: shopOrderItem.orderId })
        .from(shopOrderItem)
        .where(and(inArray(shopOrderItem.orderId, orderIds), isNotNull(shopOrderItem.subscriptionDays)))
    : [];
  const subOrders = new Set(subRows.map((r) => r.orderId));
  const latestItems = latest.length
    ? await db
        .select({ orderId: shopOrderItem.orderId, name: shopOrderItem.name })
        .from(shopOrderItem)
        .where(inArray(shopOrderItem.orderId, latest.map((o) => o.id)))
    : [];

  // Chiffre d'affaires jour par jour sur 30 jours (heure de Paris).
  const days: DayRevenue[] = Array.from({ length: 30 }, (_, i) => ({ day: parisDay.format(new Date(now - (29 - i) * DAY)), shop: 0, subscriptions: 0, sessions: 0 }));
  const byDay = new Map(days.map((d) => [d.day, d]));
  const totals = { now: { shop: 0, subscriptions: 0, sessions: 0, orders: 0 }, before: { shop: 0, subscriptions: 0, sessions: 0, orders: 0 } };
  for (const o of orders) {
    const t = o.paidAt!.getTime();
    const bucket = t >= cut30 ? totals.now : totals.before;
    const kind = subOrders.has(o.id) ? "subscriptions" : "shop";
    bucket[kind] += o.total;
    bucket.orders += 1;
    const d = byDay.get(parisDay.format(o.paidAt!));
    if (d) d[kind] += o.total;
  }
  for (const s of sessions) {
    const t = s.paidAt!.getTime();
    (t >= cut30 ? totals.now : totals.before).sessions += s.price ?? 0;
    const d = byDay.get(parisDay.format(s.paidAt!));
    if (d) d.sessions += s.price ?? 0;
  }
  const revenue = (b: typeof totals.now) => b.shop + b.subscriptions + b.sessions;
  const newClients = users.filter((u) => u.createdAt.getTime() >= cut30).length;
  const newClientsBefore = users.length - newClients;

  // Meilleures ventes des 30 derniers jours (produits, hors pass d'abonnement).
  const recentPaid = orders.filter((o) => o.paidAt!.getTime() >= cut30 && !subOrders.has(o.id)).map((o) => o.id);
  const top = recentPaid.length
    ? await db
        .select({
          id: product.id,
          name: product.name,
          slug: product.slug,
          coverFile: product.coverFile,
          units: sql<number>`count(*)`,
          cents: sql<number>`sum(${shopOrderItem.priceCents})`,
        })
        .from(shopOrderItem)
        .innerJoin(product, eq(shopOrderItem.productId, product.id))
        .where(inArray(shopOrderItem.orderId, recentPaid))
        .groupBy(product.id)
        .orderBy(desc(sql`sum(${shopOrderItem.priceCents})`))
        .limit(5)
    : [];

  const [todaySessions] = await db.select({ n: count() }).from(booking).where(and(eq(booking.date, today), eq(booking.status, "confirmed")));
  const [pendingBookings] = await db.select({ n: count() }).from(booking).where(eq(booking.status, "pending"));
  const expiring = subscribers.filter((s) => s.state === "active" && s.endsAt.getTime() - now <= 7 * DAY);

  return {
    todo: {
      orders: pendingOrders.filter((o) => !subOrders.has(o.id)).length,
      proofs: pendingOrders.filter((o) => o.proof).length,
      passes: pendingOrders.filter((o) => subOrders.has(o.id)).length,
      bookings: pendingBookings?.n ?? 0,
      todaySessions: todaySessions?.n ?? 0,
      reviews: reviewsToAnswer[0]?.n ?? 0,
      expiring: expiring.length,
    },
    kpis: {
      revenue: { value: revenue(totals.now), delta: delta(revenue(totals.now), revenue(totals.before)) },
      orders: { value: totals.now.orders, delta: delta(totals.now.orders, totals.before.orders) },
      subscribers: { value: subscribers.filter((s) => s.state === "active").length, trials: subscribers.filter((s) => s.state === "trial").length },
      newClients: { value: newClients, delta: delta(newClients, newClientsBefore) },
      split: totals.now,
    },
    days,
    latest: latest.map((o) => ({
      ...o,
      subscription: subOrders.has(o.id),
      items: latestItems.filter((i) => i.orderId === o.id).map((i) => i.name),
    })),
    top,
    expiring: expiring.slice(0, 5),
  };
}
