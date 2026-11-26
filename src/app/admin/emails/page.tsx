import { Suspense } from "react";
import { CampaignComposer } from "@/components/admin/CampaignComposer";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { getAudienceOptions, getCampaigns, getDirectEmails, getMarketingStats } from "@/lib/marketing";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Emails — Swell" };

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default function EmailsAdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <EmailsContent />
    </Suspense>
  );
}

async function EmailsContent() {
  const admin = await requireAdmin();
  const [audiences, campaigns, direct, stats] = await Promise.all([getAudienceOptions(), getCampaigns(), getDirectEmails(), getMarketingStats()]);

  return (
    <DashboardShell user={admin} title="Emails" subtitle="Campagnes vers tes clients. Pour écrire à une personne : Admin → Utilisateurs, icône enveloppe.">
      <dl className="mb-4 grid grid-cols-3 gap-3">
        {[
          ["Reçoivent les campagnes", stats.reachable],
          ["Ont accepté les emails", stats.consent],
          ["Désinscrits", stats.optOut],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-white/5 bg-surface p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <Card title="Nouvelle campagne">
        <CampaignComposer audiences={audiences} />
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Campagnes envoyées">
          {campaigns.length === 0 ? (
            <EmptyState>Aucune campagne pour l&apos;instant.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/5">
              {campaigns.map((c) => (
                <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{c.subject}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "sending" ? "bg-amber-300 text-black" : "bg-white/10 text-muted"}`}>
                      {c.status === "sending" ? "Envoi en cours" : "Envoyée"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {c.audienceLabel} · {when.format(c.createdAt)} ·{" "}
                    <span className="tabular-nums">
                      {c.sent}/{c.recipients} envoyés
                    </span>
                    {c.failed > 0 && <span className="text-red-400"> · {c.failed} échec{c.failed > 1 ? "s" : ""}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Emails personnels récents">
          {direct.length === 0 ? (
            <EmptyState>Aucun email personnel envoyé depuis l&apos;admin.</EmptyState>
          ) : (
            <ul className="divide-y divide-white/5">
              {direct.map((d) => (
                <li key={d.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium">{d.subject}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    À {d.name ?? d.email} · {when.format(d.sentAt)}
                    {!d.ok && <span className="text-red-400"> · non parti</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
