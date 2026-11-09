import { Suspense } from "react";
import { Laptop } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { AdminLicenseActions, AdminRemoveActivation } from "@/components/licenses/AdminLicenseActions";
import { getAdminLicenses, getTrialStats, publicKeyHex } from "@/lib/licenses";
import { ListSearch, Pagination } from "@/components/admin/ListControls";
import { PAGE_SIZE, readPage, readParam } from "@/lib/admin-list";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Licences — Swell" };

const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function LicensesPage({ searchParams }: PageProps<"/admin/licences">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LicensesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LicensesContent({ searchParams }: Pick<PageProps<"/admin/licences">, "searchParams">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const { page, offset } = readPage(params);
  const [{ licenses, total }, stats] = await Promise.all([
    getAdminLicenses({ q: readParam(params, "q"), state: readParam(params, "etat"), limit: PAGE_SIZE, offset }),
    getTrialStats(),
  ]);
  const publicKey = publicKeyHex();
  const now = new Date();
  const { started, converted, running } = stats;

  return (
    <DashboardShell user={admin} title="Licences" subtitle="Une clé par client et par VST payé, offert ou en essai. Désactive une clé ou libère un ordinateur ici.">
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
      {started > 0 && (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
          Démos : {started} essai{started > 1 ? "s" : ""} lancé{started > 1 ? "s" : ""} · {running} en cours ·{" "}
          <strong>{converted} acheté{converted > 1 ? "s" : ""} après l&apos;essai</strong>
          {` (${Math.round((converted / started) * 100)} %)`}
        </p>
      )}
      <Card title="Clés" action={<span className="text-xs text-muted">{total}</span>}>
        <ListSearch
          basePath="/admin/licences"
          params={params}
          placeholder="Clé, client, email ou plugin"
          filters={[
            {
              name: "etat",
              label: "État",
              options: [
                { value: "", label: "Toutes les clés" },
                { value: "active", label: "Actives" },
                { value: "trial", label: "Essais" },
                { value: "converted", label: "Achetées après essai" },
                { value: "revoked", label: "Désactivées" },
              ],
            },
          ]}
        />
        {licenses.length === 0 ? (
          <EmptyState>{readParam(params, "q") || readParam(params, "etat") ? "Aucune licence ne correspond à ta recherche." : "Aucune licence pour l'instant : elles apparaissent dès qu'un VST est payé, offert ou en essai."}</EmptyState>
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
                      {l.trialEndsAt &&
                        (l.trialEndsAt > now ? ` · essai jusqu'au ${date.format(l.trialEndsAt)}` : " · essai terminé")}
                      {l.trialStartedAt && !l.trialEndsAt && " · acheté après essai"}
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
        <Pagination basePath="/admin/licences" params={params} page={page} total={total} />
      </Card>
    </DashboardShell>
  );
}
