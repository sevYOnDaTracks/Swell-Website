import Link from "next/link";
import { Suspense } from "react";
import { MessageSquare } from "lucide-react";
import { ListSearch, Pagination } from "@/components/admin/ListControls";
import { WhatsappSetting } from "@/components/admin/SupportAdminControls";
import { DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { listHref, PAGE_SIZE, readPage, readParam } from "@/lib/admin-list";
import { requireAdmin } from "@/lib/session";
import { getAdminTickets, getSupportCounts, getSupportSettings } from "@/lib/support";
import { subjectLabel } from "@/lib/support-format";

export const metadata = { title: "Support — Swell" };

// Onglets : par défaut, les demandes qui attendent une réponse de Swell.
const TABS = [
  { value: "open", label: "À traiter" },
  { value: "answered", label: "En attente du client" },
  { value: "closed", label: "Résolues" },
  { value: "all", label: "Toutes" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** « il y a 3 h » : depuis combien de temps la demande attend. */
function ago(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `il y a ${hours} h` : `il y a ${Math.round(hours / 24)} j`;
}

export default function SupportAdminPage({ searchParams }: PageProps<"/admin/support">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SupportAdminContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SupportAdminContent({ searchParams }: Pick<PageProps<"/admin/support">, "searchParams">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const { page, offset } = readPage(params);
  const asked = readParam(params, "statut");
  const tab: Tab = TABS.some((t) => t.value === asked) ? (asked as Tab) : "open";
  const q = readParam(params, "q");
  const [{ rows, total }, counts, settings] = await Promise.all([
    getAdminTickets({ status: tab, q, limit: PAGE_SIZE, offset }),
    getSupportCounts(),
    getSupportSettings(),
  ]);

  return (
    <DashboardShell user={admin} title="Support" subtitle="Les demandes envoyées depuis la page Support du site.">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Statut des demandes" className="flex gap-1 overflow-x-auto border-b border-white/10 [scrollbar-width:none]">
          {TABS.map((t) => {
            const n = counts[t.value];
            const active = tab === t.value;
            return (
              <Link
                key={t.value}
                href={listHref("/admin/support", { ...params, page: undefined }, { statut: t.value === "open" ? null : t.value })}
                aria-current={active ? "page" : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "border-white text-foreground" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 py-px text-xs tabular-nums ${t.value === "open" && n > 0 ? "bg-amber-300 font-semibold text-black" : "bg-white/10 text-muted"}`}>{n}</span>
              </Link>
            );
          })}
        </nav>
        <WhatsappSetting value={settings.whatsapp} />
      </div>

      <ListSearch basePath="/admin/support" params={params} placeholder="Référence, nom ou email" hidden={tab === "open" ? {} : { statut: tab }} />

      {rows.length === 0 ? (
        <EmptyState>{q ? "Aucune demande ne correspond à ta recherche." : tab === "open" ? "Rien à traiter : toutes les demandes ont une réponse." : "Aucune demande ici."}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ ticket: t, productName, messages, preview }) => (
            <li key={t.id}>
              <Link
                href={`/admin/support/${t.id}`}
                className={`group grid gap-3 rounded-2xl border bg-surface p-4 transition-colors hover:border-white/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                  t.status === "open" ? "border-white/15" : "border-white/5"
                }`}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{t.name}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{subjectLabel(t.subject)}</span>
                    {productName && <span className="text-xs text-muted">{productName}</span>}
                    {!t.userId && <span className="text-xs text-muted">sans compte</span>}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-muted">{preview}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted sm:flex-col sm:items-end sm:gap-1">
                  <span className={t.status === "open" ? "font-medium text-amber-300" : ""} title={when.format(t.lastMessageAt)}>
                    {ago(t.lastMessageAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <MessageSquare size={12} /> {messages} · {t.reference}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Pagination basePath="/admin/support" params={params} page={page} total={total} />
      </div>
    </DashboardShell>
  );
}
