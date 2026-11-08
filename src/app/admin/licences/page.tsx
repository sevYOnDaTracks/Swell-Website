import { Suspense } from "react";
import { Laptop } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { AdminLicenseActions, AdminRemoveActivation } from "@/components/licenses/AdminLicenseActions";
import { getAdminLicenses, publicKeyHex } from "@/lib/licenses";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Licences — Swell" };

const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function LicensesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LicensesContent />
    </Suspense>
  );
}

async function LicensesContent() {
  const admin = await requireAdmin();
  const licenses = await getAdminLicenses();
  const publicKey = publicKeyHex();

  return (
    <DashboardShell user={admin} title="Licences" subtitle="Une clé par client et par VST payé ou offert. Désactive une clé ou libère un ordinateur ici.">
      {publicKey ? (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-muted">
          Clé publique à intégrer dans les plugins : <code className="select-all break-all font-mono text-foreground">{publicKey}</code>
        </p>
      ) : (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
          L&apos;activation est fermée : LICENSE_PRIVATE_KEY n&apos;est pas réglée sur le serveur (voir scripts/license-keygen.mjs). Les clés
          s&apos;affichent quand même chez les clients.
        </p>
      )}
      <Card title="Clés" action={<span className="text-xs text-muted">{licenses.length}</span>}>
        {licenses.length === 0 ? (
          <EmptyState>Aucune licence pour l&apos;instant : elles apparaissent dès qu&apos;un VST est payé ou offert.</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {licenses.map((l) => (
              <li key={l.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {l.productName} <span className="font-normal text-muted">· {l.clientName}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {l.clientEmail} · créée le {date.format(l.createdAt)}
                      {l.revokedAt && <span className="text-red-300"> · désactivée</span>}
                    </p>
                    <code className="select-all font-mono text-xs">{l.key}</code>
                  </div>
                  <AdminLicenseActions licenseId={l.id} revoked={!!l.revokedAt} maxActivations={l.maxActivations} />
                </div>
                <p className="text-xs text-muted">
                  {l.activations.length} / {l.maxActivations} ordinateur{l.maxActivations > 1 ? "s" : ""}
                </p>
                {l.activations.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {l.activations.map((a) => (
                      <li key={a.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2 py-1 text-xs">
                        <Laptop size={12} className="text-muted" aria-hidden />
                        {a.machineName || "Ordinateur"} <span className="text-muted">· vu le {date.format(a.lastSeenAt)}</span>
                        <AdminRemoveActivation activationId={a.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardShell>
  );
}
