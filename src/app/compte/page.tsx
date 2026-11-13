import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { AudioLines, CalendarPlus, CheckCircle2, ChevronRight, Clock, Download, MonitorSmartphone, Plug, ShoppingBag } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { BookingStatusBadge } from "@/components/booking/BookingStatus";
import { CancelMyBookingButton, ProposalAnswer } from "@/components/booking/BookingActions";
import { SessionFileList } from "@/components/booking/SessionFileList";
import { PaymentInstructions } from "@/components/orders/PaymentInstructions";
import { db } from "@/db";
import { booking, user as userTable } from "@/db/schema";
import { formatDate, parisNow } from "@/lib/booking";
import { getMyLicenses } from "@/lib/licenses";
import { getOrderHistory, getPaymentDetails, getPendingOrders, getPurchases, orderSite } from "@/lib/orders";
import { formatPrice } from "@/lib/shop-format";
import { getBookableServices, getServiceNames } from "@/lib/offers";
import { requireUser } from "@/lib/session";
import { getSessionFiles } from "@/lib/session-files";
import { currentSite } from "@/lib/site-server";

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
  // Site visité : plugins sur la boutique, réservations et instrumentales sur mix.
  const site = await currentSite();

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
  // Fichiers rendus après les séances (mix, master, stems…).
  const payment = getPaymentDetails();
  const sessionFiles = await getSessionFiles(site === "mix" ? [...active, ...archived].map((b) => b.id) : []);
  // Chaque site montre ses commandes : instrumentales sur mix, plugins et sons sur la boutique.
  const history = orderHistory.filter((o) => orderSite(o) === site);
  const pending = pendingOrders.filter((o) => orderSite(o) === site);
  const beats = purchases.filter((p) => p.type === "instrumental");
  const tabs = [
    { id: "a-venir", label: "À venir", count: active.length, href: "/compte" },
    { id: "archives", label: "Archivées", count: archived.length, href: "/compte?onglet=archives" },
  ];

  return (
    <DashboardShell user={user} title={`Salut ${firstName} 👋`} subtitle={site === "mix" ? "Retrouve ici tes réservations et tes instrumentales." : "Retrouve ici tes plugins, tes licences et tes commandes."}>
      {!(site === "mix" ? me?.mixOnboardedAt : me?.onboardedAt) && <OnboardingTour firstName={firstName} site={site} />}
      {reservation === "ok" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 text-sm">
          <CheckCircle2 size={18} className="shrink-0" /> Réservation envoyée ! Elle passera en « Confirmée » dès que
          Swell l&apos;aura validée.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {site === "mix" && (
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
                        {b.priceCents ? (
                          b.paidAt ? (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                              <CheckCircle2 size={13} /> Payée · {formatPrice(b.priceCents)}
                            </p>
                          ) : b.paymentMethod && b.paymentReference ? (
                            <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.04] p-3 text-sm">
                              <p className="mb-2 font-medium">À régler : {formatPrice(b.priceCents)}</p>
                              <PaymentInstructions
                                order={{ id: b.id, method: b.paymentMethod, totalCents: b.priceCents, reference: b.paymentReference }}
                                {...payment}
                                withProof={false}
                              />
                            </div>
                          ) : (
                            <p className="mt-1.5 text-xs text-muted">Prix : {formatPrice(b.priceCents)} · Swell t&apos;indiquera comment régler.</p>
                          )
                        ) : null}
                        {REMOTE_SERVICES.has(b.service) && (
                          <a
                            href="#anydesk"
                            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
                          >
                            <MonitorSmartphone size={13} /> Installe AnyDesk avant la session
                          </a>
                        )}
                        <SessionFileList files={sessionFiles.get(b.id)} />
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
                    <SessionFileList files={sessionFiles.get(b.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          )}

          {site === "mix" && (beats.length > 0 || pending.length > 0) && (
            <Card
              title="Mes instrumentales"
              action={
                <Link href="/compte/plugins" className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
                  Tout voir <ChevronRight size={14} />
                </Link>
              }
            >
              <p className="text-sm text-muted">
                {beats.length} instrumentale{beats.length > 1 ? "s" : ""} à télécharger
                {pending.length > 0 && ` · ${pending.length} commande${pending.length > 1 ? "s" : ""} en attente de paiement`}
              </p>
              <Link
                href="/compte/plugins"
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                <AudioLines size={16} /> Mes instrumentales
              </Link>
            </Card>
          )}

          {site === "shop" && (
          <section id="achats" className="scroll-mt-24">
            <Card
              title="Mes plugins"
              action={
                <Link href="/compte/plugins" className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
                  Tout voir <ChevronRight size={14} />
                </Link>
              }
            >
              {pending.length > 0 && (
                <Link
                  href="/compte/plugins"
                  className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 text-sm transition-colors hover:bg-white/[0.07]"
                >
                  <span>
                    {pending.length} commande{pending.length > 1 ? "s" : ""} en attente de paiement
                  </span>
                  <ChevronRight size={16} className="text-muted" />
                </Link>
              )}
              {pluginCount === 0 && pending.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                  <p className="font-medium">Tu n&apos;as pas encore de plugin</p>
                  <p className="mt-1 text-sm text-muted">Fais un tour sur la boutique : tes plugins et leurs licences arriveront ici.</p>
                  <Link
                    href="/boutique"
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
                  >
                    <ShoppingBag size={16} /> Découvrir les plugins
                  </Link>
                </div>
              ) : (
                <>
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
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link
                      href="/compte/plugins"
                      className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
                    >
                      <Plug size={16} /> Mes plugins et licences
                    </Link>
                    <Link
                      href="/boutique"
                      className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
                    >
                      <ShoppingBag size={16} /> Découvrir les plugins
                    </Link>
                  </div>
                </>
              )}
            </Card>
          </section>
          )}

          {history.length > 0 && (
            <Card title="Historique des commandes" action={<span className="text-xs text-muted">{history.length} commande{history.length > 1 ? "s" : ""}</span>}>
              <ul className="-mx-3 space-y-1">
                {history.map((o) => (
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
          {site === "mix" ? (
          <>
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
          </>
          ) : (
            <Card title="Activer un plugin">
              <ol className="space-y-3 text-sm text-muted">
                <li>
                  <span className="font-medium text-foreground">1.</span> Télécharge le plugin depuis{" "}
                  <Link href="/compte/plugins" className="text-foreground underline underline-offset-4">
                    Mes plugins
                  </Link>{" "}
                  et installe-le (VST3, AU ou Standalone).
                </li>
                <li>
                  <span className="font-medium text-foreground">2.</span> Copie ta clé de licence, juste sous le plugin.
                </li>
                <li>
                  <span className="font-medium text-foreground">3.</span> Ouvre le plugin dans ton DAW, colle la clé et clique sur Activer. Internet ne sert
                  qu&apos;une fois.
                </li>
              </ol>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
