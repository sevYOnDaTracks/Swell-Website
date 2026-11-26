import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, LifeBuoy } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { requireUser } from "@/lib/session";
import { getMyTickets } from "@/lib/support";
import { SUPPORT_STATUS_LABELS, subjectLabel } from "@/lib/support-format";

export const metadata = { title: "Mes demandes — Swell" };

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default function MyTicketsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MyTicketsContent />
    </Suspense>
  );
}

async function MyTicketsContent() {
  const user = await requireUser();
  const tickets = await getMyTickets(user.id);
  return (
    <DashboardShell user={user} title="Mes demandes" subtitle="Tes échanges avec le support Swell.">
      <Card
        title="Demandes"
        action={
          <Link href="/support" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black hover:bg-neutral-200">
            <LifeBuoy size={15} /> Nouvelle demande
          </Link>
        }
      >
        {tickets.length === 0 ? (
          <EmptyState>Aucune demande pour l&apos;instant. Une question ? Le support te répond en général dans la journée.</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/support/suivi/${t.reference}?t=${t.token}`} className="group flex items-center gap-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {subjectLabel(t.subject)}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-normal ${t.status === "answered" ? "bg-white text-black" : "bg-white/10 text-muted"}`}>
                        {SUPPORT_STATUS_LABELS[t.status]}
                      </span>
                    </p>
                    <p className="text-sm text-muted">
                      {t.reference} · dernier message le {when.format(t.lastMessageAt)}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardShell>
  );
}
