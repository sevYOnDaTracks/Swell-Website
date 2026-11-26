import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { and, asc, desc, eq, gte, lte, ne } from "drizzle-orm";
import { ArrowRight, CalendarCheck, CalendarClock, CheckCircle2, Crown, Hourglass, Receipt, Star, TrendingDown, TrendingUp } from "lucide-react";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { getDashboardData } from "@/lib/admin-dashboard";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { BookingStatusBadge } from "@/components/booking/BookingStatus";
import { AdminBookingActions, AdminBookingPayment } from "@/components/booking/BookingActions";
import { SessionFilesManager } from "@/components/booking/SessionFilesManager";
import { db } from "@/db";
import { booking, user as userTable } from "@/db/schema";
import { formatDate, parisNow } from "@/lib/booking";
import { getServiceNames } from "@/lib/offers";
import { METHOD_LABELS } from "@/lib/payments";
import { formatPrice, mediaUrl } from "@/lib/shop-format";
import { formatPhone, phoneHref } from "@/lib/phone";
import { requireAdmin } from "@/lib/session";
import { getSessionFiles } from "@/lib/session-files";

export const metadata = { title: "Admin — Swell" };

const todayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const orderDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

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

  const [dash, bookings, recent, serviceName] = await Promise.all([
    getDashboardData(today),
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
        priceCents: booking.priceCents,
        paymentMethod: booking.paymentMethod,
        paymentReference: booking.paymentReference,
        paidAt: booking.paidAt,
        clientName: userTable.name,
        clientEmail: userTable.email,
        clientPhone: userTable.phone,
      })
      .from(booking)
      .innerJoin(userTable, eq(booking.userId, userTable.id))
      .where(and(gte(booking.date, today), ne(booking.status, "cancelled")))
      .orderBy(asc(booking.date), asc(booking.startTime)),
    // Séances confirmées déjà commencées (aujourd'hui compris) : on y dépose les fichiers du client.
    db
      .select({
        id: booking.id,
        service: booking.service,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        priceCents: booking.priceCents,
        paymentMethod: booking.paymentMethod,
        paymentReference: booking.paymentReference,
        paidAt: booking.paidAt,
        clientName: userTable.name,
        clientEmail: userTable.email,
      })
      .from(booking)
      .innerJoin(userTable, eq(booking.userId, userTable.id))
      .where(and(lte(booking.date, today), eq(booking.status, "confirmed")))
      .orderBy(desc(booking.date), desc(booking.startTime))
      .limit(20),
    getServiceNames(),
  ]);

  const recentFiles = await getSessionFiles(recent.map((b) => b.id));
  const t = dash.todo;
  const todo = [
    { n: t.orders, label: t.orders > 1 ? "paiements à vérifier" : "paiement à vérifier", hint: t.proofs ? `dont ${t.proofs} avec capture reçue` : null, href: t.proofs ? "/admin/commandes?statut=proof" : "/admin/commandes?statut=pending", Icon: Receipt },
    { n: t.passes, label: t.passes > 1 ? "pass d'abonnement à valider" : "pass d'abonnement à valider", hint: null, href: "/admin/commandes?statut=pending", Icon: Crown },
    { n: t.bookings, label: t.bookings > 1 ? "demandes de séance à confirmer" : "demande de séance à confirmer", hint: null, href: "#seances", Icon: CalendarClock },
    { n: t.todaySessions, label: t.todaySessions > 1 ? "séances aujourd'hui" : "séance aujourd'hui", hint: null, href: "#seances", Icon: CalendarCheck },
    { n: t.reviews, label: t.reviews > 1 ? "avis sans réponse" : "avis sans réponse", hint: "sur les 30 derniers jours", href: "/admin/avis", Icon: Star },
    { n: t.expiring, label: t.expiring > 1 ? "abonnements finissent cette semaine" : "abonnement finit cette semaine", hint: "un mot peut aider à renouveler", href: "/admin/abonnements", Icon: Hourglass },
  ].filter((item) => item.n > 0);
  const k = dash.kpis;
  const kpis = [
    { label: "Chiffre d'affaires", value: formatPrice(k.revenue.value) === "Gratuit" ? "0 €" : formatPrice(k.revenue.value), delta: k.revenue.delta, note: "30 derniers jours" },
    { label: "Commandes payées", value: String(k.orders.value), delta: k.orders.delta, note: "30 derniers jours" },
    { label: "Abonnés actifs", value: String(k.subscribers.value), delta: null, note: k.subscribers.trials ? `+ ${k.subscribers.trials} en essai` : "aujourd'hui" },
    { label: "Nouveaux clients", value: String(k.newClients.value), delta: k.newClients.delta, note: "30 derniers jours" },
  ];
  const split = k.split;

  return (
    <DashboardShell user={admin} title="Tableau de bord" subtitle={`Bonjour ${admin.name.split(" ")[0]} · ${todayLabel.format(new Date(`${today}T12:00:00`))}`}>
      <section aria-labelledby="todo-title" className="rounded-2xl border border-white/10 bg-surface">
        <h2 id="todo-title" className="border-b border-white/10 px-5 py-3.5 font-semibold">
          À faire
        </h2>
        {todo.length === 0 ? (
          <p className="flex items-center gap-3 px-5 py-5 text-sm text-muted">
            <CheckCircle2 size={18} className="text-foreground" /> Rien n&apos;attend. Tout est à jour.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {todo.map(({ n, label, hint, href, Icon }) => (
              <li key={label}>
                <Link href={href} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03]">
                  <Icon size={18} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">
                      <span className="tabular-nums">{n}</span> {label}
                    </span>
                    {hint && <span className="ml-2 text-sm text-muted">{hint}</span>}
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, delta, note }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-surface p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              {delta !== null && (
                <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                  {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {delta > 0 ? "+" : ""}
                  {delta} %
                </span>
              )}
              {note}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-white/5 bg-surface p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Chiffre d&apos;affaires</h2>
            <p className="text-sm text-muted">Par jour, sur les 30 derniers jours</p>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {(
              [
                ["Boutique", split.shop],
                ["Abonnements", split.subscriptions],
                ["Séances", split.sessions],
              ] as const
            ).map(([label, v]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="font-semibold tabular-nums">{v ? formatPrice(v) : "0 €"}</dd>
              </div>
            ))}
          </dl>
        </div>
        <RevenueChart days={dash.days} />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card
          title="Dernières commandes"
          action={
            <Link href="/admin/commandes" className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
              Toutes les commandes
            </Link>
          }
        >
          {dash.latest.length === 0 ? (
            <EmptyState>Aucune commande pour le moment.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/5">
              {dash.latest.map((o) => (
                <li key={o.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {o.client}
                      {o.subscription && <span className="rounded-full border border-white/15 px-2 py-px text-[11px] font-normal text-muted">Abonnement</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {o.reference} · {o.items.join(", ")} · {orderDate.format(o.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{o.method === "gift" ? "Offert" : formatPrice(o.total)}</p>
                    <p className={`text-xs ${o.status === "pending" ? "text-amber-300" : "text-muted"}`}>
                      {o.status === "paid" ? "Payée" : o.status === "cancelled" ? "Annulée" : o.proof ? "Capture reçue" : "En attente"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Meilleures ventes" action={<span className="text-xs text-muted">30 derniers jours</span>}>
          {dash.top.length === 0 ? (
            <EmptyState>Pas encore de vente payée sur la période.</EmptyState>
          ) : (
            <ol className="space-y-3">
              {dash.top.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/boutique/${p.slug}`} className="group flex items-center gap-3">
                    <span className="w-4 shrink-0 text-right text-xs text-muted tabular-nums">{i + 1}</span>
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-2">
                      {p.coverFile && <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="36px" unoptimized className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:underline">{p.name}</span>
                    <span className="shrink-0 text-right text-xs text-muted tabular-nums">
                      <span className="block text-sm font-semibold text-foreground">{formatPrice(Number(p.cents))}</span>
                      {p.units} vente{p.units > 1 ? "s" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="mt-4 space-y-4">
        <div id="seances" className="scroll-mt-24" />
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
                    {b.priceCents ? <Payment b={b} /> : null}
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

        <Card title="Séances récentes" action={<span className="text-xs text-muted">Fichiers à rendre au client</span>}>
          {recent.length === 0 ? (
            <EmptyState>Aucune séance confirmée terminée pour le moment.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map((b) => (
                <li key={b.id} className="py-4 first:pt-0 last:pb-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="capitalize">{formatDate(b.date)}</span>
                    <span className="text-muted">·</span>
                    <span className="tabular-nums">
                      {b.startTime} – {b.endTime}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {serviceName(b.service)} — {b.clientName} ({b.clientEmail})
                  </p>
                  {b.priceCents ? <Payment b={b} /> : null}
                  <SessionFilesManager bookingId={b.id} files={recentFiles.get(b.id) ?? []} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}

type PaymentRow = { id: string; priceCents: number | null; paymentMethod: string | null; paymentReference: string | null; paidAt: Date | null };

function Payment({ b }: { b: PaymentRow }) {
  return (
    <AdminBookingPayment
      id={b.id}
      price={formatPrice(b.priceCents ?? 0)}
      method={b.paymentMethod ? (METHOD_LABELS[b.paymentMethod] ?? b.paymentMethod) : null}
      reference={b.paymentReference}
      paid={!!b.paidAt}
    />
  );
}
