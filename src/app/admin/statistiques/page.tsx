import { Suspense } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { VisitsChart } from "@/components/admin/VisitsChart";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { getAnalytics, type Bucket, type Period, type SiteFilter } from "@/lib/analytics";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Statistiques — Swell" };

const nf = new Intl.NumberFormat("fr-FR");
const PERIODS: { value: Period; label: string }[] = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "365", label: "12 mois" },
];
const SITES: { value: SiteFilter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "shop", label: "Boutique" },
  { value: "mix", label: "Mix" },
];

export default function StatsPage({ searchParams }: PageProps<"/admin/statistiques">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StatsContent searchParams={searchParams} />
    </Suspense>
  );
}

function delta(now: number, before: number) {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10} %`.replace(".", ",") : "—");

/** Liste classée : nom, barre discrète proportionnelle, nombre de visiteurs. */
function Ranked({ rows, empty, unit = "visiteurs" }: { rows: Bucket[]; empty: string; unit?: string }) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;
  const max = Math.max(...rows.map((r) => r.visitors));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.key} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2.5 py-1.5 text-sm">
          <span aria-hidden className="absolute inset-y-0 left-0 rounded-md bg-white/[0.07]" style={{ width: `${(r.visitors / max) * 100}%` }} />
          <span className="relative min-w-0 truncate">{r.label}</span>
          <span className="relative shrink-0 tabular-nums text-muted" title={`${r.visitors} ${unit}, ${r.views} pages vues`}>
            <span className="font-medium text-foreground">{nf.format(r.visitors)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

async function StatsContent({ searchParams }: Pick<PageProps<"/admin/statistiques">, "searchParams">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const period: Period = PERIODS.some((p) => p.value === params.periode) ? (params.periode as Period) : "30";
  const site: SiteFilter = SITES.some((s) => s.value === params.site) ? (params.site as SiteFilter) : "all";
  const a = await getAnalytics(period, site);
  const href = (p: Period, s: SiteFilter) => `/admin/statistiques?periode=${p}${s === "all" ? "" : `&site=${s}`}`;
  const since = new Date(`${a.since}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const kpis = [
    { label: "Visiteurs", value: nf.format(a.current.visitors), d: delta(a.current.visitors, a.previous.visitors), note: "comptés une fois par jour" },
    { label: "Pages vues", value: nf.format(a.current.views), d: delta(a.current.views, a.previous.views), note: a.current.visitors ? `${(a.current.views / a.current.visitors).toFixed(1).replace(".", ",")} par visiteur` : "—" },
    { label: "Ajouts au panier", value: nf.format(a.funnel[2].n), d: null, note: `${pct(a.funnel[2].n, a.current.visitors)} des visiteurs` },
    { label: "Taux de conversion", value: pct(a.funnel[4].n, a.current.visitors), d: null, note: "paiements validés / visiteurs" },
  ];

  return (
    <DashboardShell user={admin} title="Statistiques" subtitle={`Depuis le ${since}. Mesure anonyme, sans cookie ; tes propres visites ne comptent pas.`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Période" className="flex rounded-lg border border-white/10 p-0.5 text-sm">
          {PERIODS.map((p) => (
            <Link key={p.value} href={href(p.value, site)} aria-current={p.value === period ? "page" : undefined} className={`rounded-md px-3 py-1.5 transition-colors ${p.value === period ? "bg-white text-black" : "text-muted hover:text-foreground"}`}>
              {p.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Site" className="flex rounded-lg border border-white/10 p-0.5 text-sm">
          {SITES.map((s) => (
            <Link key={s.value} href={href(period, s.value)} aria-current={s.value === site ? "page" : undefined} className={`rounded-md px-3 py-1.5 transition-colors ${s.value === site ? "bg-white/15 text-foreground" : "text-muted hover:text-foreground"}`}>
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, d, note }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-surface p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              {d !== null && (
                <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
                  {d >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {d > 0 ? "+" : ""}
                  {d} %
                </span>
              )}
              {note}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-2xl border border-white/5 bg-surface p-5 sm:p-6">
        <div className="mb-6">
          <h2 className="font-semibold">Visiteurs</h2>
          <p className="text-sm text-muted">{period === "365" ? "Par mois, sur 12 mois" : `Par jour, sur ${period} jours`}</p>
        </div>
        <VisitsChart buckets={a.chart} monthly={period === "365"} />
      </section>

      <section className="mt-4 rounded-2xl border border-white/5 bg-surface p-5 sm:p-6">
        <h2 className="font-semibold">Tunnel de vente</h2>
        <p className="text-sm text-muted">Où les visiteurs s&apos;arrêtent, de l&apos;arrivée au paiement validé.</p>
        <ol className="mt-5 space-y-2">
          {a.funnel.map((step, i) => {
            const top = a.funnel[0].n || 1;
            const prev = i > 0 ? a.funnel[i - 1].n : null;
            return (
              <li key={step.label} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[12rem_minmax(0,1fr)_7rem]">
                <span className="truncate">{step.label}</span>
                <span className="h-7 overflow-hidden rounded-md bg-white/[0.04]">
                  <span className="block h-full rounded-md bg-white/70" style={{ width: `${Math.max(step.n ? 1.5 : 0, (step.n / top) * 100)}%` }} />
                </span>
                <span className="text-right tabular-nums">
                  <span className="font-semibold">{nf.format(step.n)}</span>
                  {prev !== null && <span className="ml-2 text-xs text-muted">{pct(step.n, prev)}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-muted">Le pourcentage compare chaque étape à la précédente. Les paiements validés viennent des commandes (hors cadeaux et produits gratuits).</p>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="D'où ils viennent" action={<span className="text-xs text-muted">visiteurs</span>}>
          <Ranked rows={a.sources} empty="Pas encore de visite sur la période." />
        </Card>
        <Card title="Plugins les plus regardés" action={<span className="text-xs text-muted">visiteurs</span>}>
          <Ranked rows={a.products} empty="Aucune page plugin vue sur la période." />
        </Card>
        <Card title="Pages les plus vues" action={<span className="text-xs text-muted">visiteurs</span>}>
          <Ranked rows={a.pages} empty="Pas encore de visite sur la période." />
        </Card>
        <div className="space-y-4">
          <Card title="Appareils">
            <Ranked rows={a.devices} empty="Pas encore de données." />
          </Card>
          <Card title="Pays" action={<span className="text-xs text-muted">d&apos;après la langue du navigateur</span>}>
            <Ranked rows={a.countries} empty="Pas encore de données." />
          </Card>
        </div>
        <Card title="Campagnes email" action={<span className="text-xs text-muted">visiteurs venus du bouton</span>}>
          <Ranked rows={a.campaigns} empty="Aucune visite venue d'une campagne sur la période." />
        </Card>
      </div>
    </DashboardShell>
  );
}
