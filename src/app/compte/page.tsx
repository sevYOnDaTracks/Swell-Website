import Link from "next/link";
import { headers } from "next/headers";
import { Suspense } from "react";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { CalendarPlus, CheckCircle2, ChevronRight, Clock, Download, MonitorSmartphone, Plug } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { BookingStatusBadge } from "@/components/booking/BookingStatus";
import { CancelMyBookingButton, ProposalAnswer } from "@/components/booking/BookingActions";
import { db } from "@/db";
import { booking, user as userTable } from "@/db/schema";
import { formatDate, parisNow } from "@/lib/booking";
import { getMyLicenses } from "@/lib/licenses";
import { getOrderHistory, getPendingOrders, getPurchases } from "@/lib/orders";
import { formatPrice } from "@/lib/shop-format";
import { getBookableServices, getServiceNames } from "@/lib/offers";
import { requireUser } from "@/lib/session";
import { isMixHost } from "@/lib/sites";

export const metadata = { title: "Mon espace — Swell" };

// Logiciel de prise en main à distance (installation de plugins, aide sur l'ordinateur).
// Liens de téléchargement directs : la page anydesk.com bloque souvent derrière une vérification Cloudflare.
const ANYDESK_DOWNLOADS = [
  { label: "Windows", href: "https://download.anydesk.com/AnyDesk.exe" },
  { label: "macOS", href: "https://download.anydesk.com/anydesk.dmg" },
];
const REMOTE_SERVICES = new Set(["plugins"]);
const orderDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function AccountPage({ searchParams }: PageProps<"/compte">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AccountContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountContent({ searchParams }: Pick<PageProps<"/compte">, "searchParams">) {
  const user = await requireUser();
  const { reservation, onglet } = await searchParams;
  const tab = onglet === "archives" ? "archives" : "a-venir";
  const today = parisNow().date;
  const firstName = user.name.split(" ")[0];
  // Tutoriel du site visité : plugins sur la boutique, réservations sur mix.
  const site = isMixHost((await headers()).get("host")) ? "mix" : "shop";

  const [upcoming, past, serviceName, bookingServices, [me], purchases, pendingOrders, orderHistory, licenses] = await Promise.all([
    db
      .select()
      .from(booking)
      .where(and(eq(booking.userId, user.id), gte(booking.date, today)))
      .orderBy(asc(booking.date), asc(booking.startTime)),
    db
      .select()
      .from(booking)
      .where(and(eq(booking.userId, user.id), lt(booking.date, today)))
      .orderBy(desc(booking.date), desc(booking.startTime))
      .limit(50),
    getServiceNames(),
    getBookableServices(),
    db.select({ onboardedAt: userTable.onboardedAt, mixOnboardedAt: userTable.mixOnboardedAt }).from(userTable).where(eq(userTable.id, user.id)),
    getPurchases(user.id),
    getPendingOrders(user.id),
    getOrderHistory(user.id),
    getMyLicenses(user.id),
  ]);
  // Résumé : le détail (téléchargements, clés, ordinateurs) est sur /compte/plugins.
  const now = new Date();
  const pluginCount = purchases.filter((p) => p.type === "vst").length;
  const activeKeys = licenses.filter((l) => !l.revokedAt && (!l.trialEndsAt || l.trialEndsAt > now)).length;
  const runningTrials = licenses.filter((l) => l.trialEndsAt && l.trialEndsAt > now).length;
  // À venir : sessions futures encore actives. Archivées : sessions passées et annulations.
  const active = upcoming.filter((b) => b.status !== "cancelled");
  const archived = [...upcoming.filter((b) => b.status === "cancelled"), ...past].sort(
    (a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime),
  );
  const tabs = [
    { id: "a-venir", label: "À venir", count: active.length, href: "/compte" },
    { id: "archives", label: "Archivées", count: archived.length, href: "/compte?onglet=archives" },
  ];

  return (
    <DashboardShell user={user} title={`Salut ${firstName} 👋`} subtitle="Retrouve ici tes réservations et tes achats.">
      {!(site === "mix" ? me?.mixOnboardedAt : me?.onboardedAt) && <OnboardingTour firstName={firstName} site={site} />}
      {reservation === "ok" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0" /> Réservation envoyée ! Elle passera en « Confirmée » dès que
          Swell l&apos;aura validée.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Mes réservations" action={<span className="text-xs text-muted">{active.length} à venir</span>}>
            <nav className="mb-4 flex gap-1 rounded-lg border border-white/5 bg-background/40 p-1 text-sm" aria-label="Réservations">
              {tabs.map((t) => (
                <Link
                  key={t.id}
                  href={t.href}
                  scroll={false}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 transition-colors ${
                    tab === t.id ? "bg-white text-black" : "text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-1.5 text-xs ${tab === t.id ? "bg-black/10" : "bg-white/5"}`}>{t.count}</span>
                </Link>
              ))}
            </nav>

            {tab === "a-venir" ? (
              active.length === 0 ? (
                <EmptyState>
                  Aucune session réservée pour le moment.{" "}
                  <Link href="/reserver" className="text-foreground underline underline-offset-4">
                    Réserver
                  </Link>
                </EmptyState>
              ) : (
                <ul className="divide-y divide-white/5">
                  {active.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-medium">{serviceName(b.service)}</p>
                        <p className={`mt-0.5 flex items-center gap-1.5 text-sm text-muted ${b.status === "proposed" ? "line-through" : ""}`}>
                          <Clock size={13} />
                          <span className="capitalize">{formatDate(b.date)}</span> · {b.startTime} – {b.endTime}
                        </p>
                        {b.status === "proposed" && b.proposedDate && (
                          <div className="mt-3 rounded-xl border border-dashed border-white/30 p-3">
                            <p className="text-sm">
                              Nouveau créneau proposé :{" "}
                              <span className="font-medium">
                                <span className="capitalize">{formatDate(b.proposedDate)}</span> · {b.proposedStartTime} – {b.proposedEndTime}
                              </span>
                            </p>
                            {b.proposalNote && <p className="mt-1 text-sm text-muted">« {b.proposalNote} »</p>}
                            <div className="mt-3">
                              <ProposalAnswer id={b.id} />
                            </div>
                          </div>
                        )}
                        {REMOTE_SERVICES.has(b.service) && (
                          <a
                            href="#anydesk"
                            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
                          >
                            <MonitorSmartphone size={13} /> Installe AnyDesk avant la session
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <BookingStatusBadge status={b.status} />
                        <CancelMyBookingButton id={b.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : archived.length === 0 ? (
              <EmptyState>Aucune session passée ou annulée.</EmptyState>
            ) : (
              <ul className="divide-y divide-white/5">
                {archived.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-muted">{serviceName(b.service)}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                        <Clock size={13} />
                        <span className="capitalize">{formatDate(b.date)}</span> · {b.startTime} – {b.endTime}
                      </p>
                    </div>
                    {b.status === "cancelled" ? (
                      <BookingStatusBadge status={b.status} />
                    ) : (
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs whitespace-nowrap text-muted">Passée</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <section id="achats" className="scroll-mt-24">
            <Card
              title="Mes plugins"
              action={
                <Link href="/compte/plugins" className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
                  Tout voir <ChevronRight size={14} />
                </Link>
              }
            >
              {pendingOrders.length > 0 && (
                <Link
                  href="/compte/plugins"
                  className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 text-sm transition-colors hover:bg-white/[0.07]"
                >
                  <span>
                    {pendingOrders.length} commande{pendingOrders.length > 1 ? "s" : ""} en attente de paiement
                  </span>
                  <ChevronRight size={16} className="text-muted" />
                </Link>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { value: pluginCount, label: `plugin${pluginCount > 1 ? "s" : ""}` },
                  { value: activeKeys, label: `licence${activeKeys > 1 ? "s" : ""} active${activeKeys > 1 ? "s" : ""}` },
                  { value: runningTrials, label: `essai${runningTrials > 1 ? "s" : ""} en cours` },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/5 bg-background/40 px-2 py-3">
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                    <p className="text-xs text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/compte/plugins"
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                <Plug size={16} /> Mes plugins, téléchargements et licences
              </Link>
            </Card>
          </section>

          {orderHistory.length > 0 && (
            <Card title="Historique des commandes" action={<span className="text-xs text-muted">{orderHistory.length} commande{orderHistory.length > 1 ? "s" : ""}</span>}>
              <ul className="-mx-3 space-y-1">
                {orderHistory.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/compte/commandes/${o.reference}`}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl px-3 py-3 text-sm transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${o.status === "cancelled" ? "text-muted" : ""}`}>{o.items.map((i) => i.name).join(", ")}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {orderDate.format(o.createdAt)} · <span className="font-mono">{o.reference}</span>
                          {o.promoCode && ` · code ${o.promoCode}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <OrderStatusBadge status={o.status} free={o.method === "free"} gift={o.method === "gift"} />
                        <span className={`w-16 text-right font-semibold tabular-nums ${o.status === "cancelled" ? "text-muted line-through" : ""}`}>
                          {o.method === "gift" ? "Offert" : o.totalCents === 0 ? "Gratuit" : formatPrice(o.totalCents)}
                        </span>
                        <ChevronRight size={16} className="text-muted" aria-hidden />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Réserver une session">
            <ul className="space-y-2">
              {bookingServices.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/reserver?service=${s.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-background/40 px-3 py-3 text-sm transition-colors hover:border-white/25"
                  >
                    {s.name}
                    <CalendarPlus size={16} className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <section id="anydesk" className="scroll-mt-24">
            <Card title="Prise en main à distance">
              <p className="text-sm text-muted">
                Pour une installation de plugins ou si j&apos;ai besoin de voir ton écran, on passe par AnyDesk. Installe-le
                avant la session et donne-moi ton identifiant au début.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {ANYDESK_DOWNLOADS.map((d) => (
                  <li key={d.label}>
                    <a
                      href={d.href}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-background/40 px-3 py-3 text-sm transition-colors hover:border-white/25"
                    >
                      <Download size={15} /> AnyDesk {d.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
