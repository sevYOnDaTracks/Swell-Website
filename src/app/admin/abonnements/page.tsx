import { Suspense } from "react";
import { and, countDistinct, eq, isNotNull } from "drizzle-orm";
import { SubscriptionAdminPanel, type AdminStats, type AdminSubscriber } from "@/components/admin/SubscriptionAdmin";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { db } from "@/db";
import { shopOrder, shopOrderItem } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { getAdminSubscribers, getSubscriptionRevenue30d, getSubscriptionSettings, getVstPlugins } from "@/lib/subscriptions";

export const metadata = { title: "Abonnements — Swell" };

const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });

export default function SubscriptionsAdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SubscriptionsAdminContent />
    </Suspense>
  );
}

async function SubscriptionsAdminContent() {
  const admin = await requireAdmin();
  const [settings, subscribers, revenue, plugins, [pending]] = await Promise.all([
    getSubscriptionSettings(),
    getAdminSubscribers(),
    getSubscriptionRevenue30d(),
    getVstPlugins(),
    // Pass commandés mais pas encore payés : à valider dans Commandes.
    db
      .select({ total: countDistinct(shopOrder.id) })
      .from(shopOrder)
      .innerJoin(shopOrderItem, eq(shopOrderItem.orderId, shopOrder.id))
      .where(and(eq(shopOrder.status, "pending"), isNotNull(shopOrderItem.subscriptionDays))),
  ]);
  const trialUsers = new Set(subscribers.filter((s) => s.trial).map((s) => s.userId));
  const convertedUsers = new Set(subscribers.filter((s) => s.convertedFromTrial).map((s) => s.userId));
  const stats: AdminStats = {
    active: subscribers.filter((s) => s.state === "active").length,
    trial: subscribers.filter((s) => s.state === "trial").length,
    grace: subscribers.filter((s) => s.state === "grace").length,
    revenueCents: Number(revenue.total),
    passCount: Number(revenue.count),
    trials: trialUsers.size,
    converted: convertedUsers.size,
    pendingPasses: pending?.total ?? 0,
  };
  const rows: AdminSubscriber[] = subscribers.map((s) => ({
    key: `${s.userId}:${s.formulaId}`,
    name: s.name,
    email: s.email,
    formulaName: s.formulaName,
    state: s.state,
    endsLabel: date.format(s.endsAt),
    sinceLabel: date.format(s.since),
    paid: s.paid,
    gifts: s.gifts,
  }));

  return (
    <DashboardShell user={admin} title="Abonnements" subtitle="Formules prépayées : les pass se valident depuis les commandes, comme un achat.">
      <SubscriptionAdminPanel
        settings={settings}
        plugins={plugins.map((p) => ({ id: p.id, name: p.name, coverFile: p.coverFile }))}
        subscribers={rows}
        stats={stats}
      />
    </DashboardShell>
  );
}
