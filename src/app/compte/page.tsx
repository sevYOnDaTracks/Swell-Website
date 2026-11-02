import Link from "next/link";
import { Suspense } from "react";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { CalendarPlus, CheckCircle2, Clock, Download, MonitorSmartphone } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";
import { BookingStatusBadge } from "@/components/booking/BookingStatus";
import { CancelMyBookingButton } from "@/components/booking/BookingActions";
import { db } from "@/db";
import { booking, user as userTable } from "@/db/schema";
import { formatDate, parisNow } from "@/lib/booking";
import { getBookableServices, getServiceNames } from "@/lib/offers";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Mon espace — Swell" };

// Logiciel de prise en main à distance (installation de plugins, aide sur l'ordinateur).
// Liens de téléchargement directs : la page anydesk.com bloque souvent derrière une vérification Cloudflare.
const ANYDESK_DOWNLOADS = [
  { label: "Windows", href: "https://download.anydesk.com/AnyDesk.exe" },
  { label: "macOS", href: "https://download.anydesk.com/anydesk.dmg" },
];
const REMOTE_SERVICES = new Set(["plugins"]);

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

  const [upcoming, past, serviceName, bookingServices, [me]] = await Promise.all([
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
    db.select({ onboardedAt: userTable.onboardedAt }).from(userTable).where(eq(userTable.id, user.id)),
  ]);
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
      {!me?.onboardedAt && <OnboardingTour firstName={firstName} />}
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
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                          <Clock size={13} />
                          <span className="capitalize">{formatDate(b.date)}</span> · {b.startTime} – {b.endTime}
                        </p>
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

          <Card
            title="Mes achats"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Download size={14} /> VST & Drum kits
              </span>
            }
          >
            <EmptyState>
              Tes VST et drum kits achetés apparaîtront ici.{" "}
              <Link href="/boutique" className="text-foreground underline underline-offset-4">
                Voir la boutique
              </Link>
            </EmptyState>
          </Card>
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
