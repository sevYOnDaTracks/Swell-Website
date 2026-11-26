import Link from "next/link";
import { Suspense } from "react";
import { GiftSubscriptionForm, SubscriptionSettingsForm } from "@/components/admin/SubscriptionAdmin";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { requireAdmin } from "@/lib/session";
import { formatPrice } from "@/lib/shop-format";
import { SUBSCRIPTION_NAME, SUBSCRIPTION_STATE_LABELS } from "@/lib/subscription-plans";
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

const STATE_STYLES = {
  none: "bg-white/5 text-muted",
  trial: "bg-white/15 text-foreground",
  active: "bg-white text-black",
  grace: "bg-amber-300 text-black",
  expired: "bg-white/5 text-muted",
} as const;

async function SubscriptionsAdminContent() {
  const admin = await requireAdmin();
  const [settings, subscribers, revenue, plugins] = await Promise.all([
    getSubscriptionSettings(),
    getAdminSubscribers(),
    getSubscriptionRevenue30d(),
    getVstPlugins(),
  ]);
  const countOf = (state: keyof typeof STATE_STYLES) => subscribers.filter((s) => s.state === state).length;
  const trials = subscribers.filter((s) => s.trial > 0);
  const converted = trials.filter((s) => s.convertedFromTrial).length;

  return (
    <DashboardShell
      user={admin}
      title="Abonnements"
      subtitle={`${SUBSCRIPTION_NAME} : pass prépayés validés depuis les commandes, essai gratuit, jours offerts.`}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Abonnés actifs", String(countOf("active"))],
            ["En essai", String(countOf("trial"))],
            ["À renouveler", String(countOf("grace"))],
            ["Pass payés (30 j)", `${Number(revenue.total) > 0 ? formatPrice(Number(revenue.total)) : "0 €"} · ${revenue.count}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-surface p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        {trials.length > 0 && (
          <p className="text-sm text-muted">
            {trials.length} essai{trials.length > 1 ? "s" : ""} lancé{trials.length > 1 ? "s" : ""},{" "}
            <strong className="text-foreground">
              {converted} abonné{converted > 1 ? "s" : ""} ensuite
            </strong>{" "}
            ({Math.round((converted / trials.length) * 100)} %).
          </p>
        )}

        <Card
          title="Abonnés"
          action={
            <Link href="/admin/commandes?statut=pending" className="text-xs text-muted underline underline-offset-4 hover:text-foreground">
              Pass à valider dans Commandes
            </Link>
          }
        >
          {subscribers.length === 0 ? (
            <EmptyState>Personne n&apos;a encore d&apos;abonnement ni d&apos;essai.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/5">
              {subscribers.map((s) => (
                <li key={s.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted">
                      {s.email} · depuis le {date.format(s.since)}
                      {s.paid > 0 && ` · ${s.paid} pass payé${s.paid > 1 ? "s" : ""}`}
                      {s.gifts > 0 && ` · ${s.gifts} cadeau${s.gifts > 1 ? "x" : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      {s.state === "expired" ? "fini le" : "jusqu'au"} {date.format(s.endsAt)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATE_STYLES[s.state]}`}>{SUBSCRIPTION_STATE_LABELS[s.state]}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card title="Réglages">
            <div className="mt-4">
              <SubscriptionSettingsForm settings={settings} plugins={plugins.map((p) => ({ id: p.id, name: p.name }))} />
            </div>
          </Card>
          <Card title="Offrir des jours">
            <p className="mt-1 text-sm text-muted">Les jours s&apos;ajoutent à la suite de l&apos;accès en cours du client.</p>
            <div className="mt-4">
              <GiftSubscriptionForm />
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
