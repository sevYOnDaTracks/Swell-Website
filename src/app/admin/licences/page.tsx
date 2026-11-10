import { Suspense } from "react";
import { ChevronDown, Laptop } from "lucide-react";
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
  const [{ clients, total }, stats] = await Promise.all([
    getAdminLicenses({ q: readParam(params, "q"), state: readParam(params, "etat"), limit: PAGE_SIZE, offset }),
    getTrialStats(),
  ]);
  const publicKey = publicKeyHex();
  const now = new Date();
  const { started, converted, running } = stats;

  return (
    <DashboardShell user={admin} title="Licences" subtitle="Les clés sont rangées par client : ouvre un client pour voir ses plugins, désactiver une clé ou libérer un ordinateur.">
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
      <Card title="Clients" action={<span className="text-xs text-muted">{total} client{total > 1 ? "s" : ""}</span>}>
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
        {clients.length === 0 ? (
          <EmptyState>{readParam(params, "q") || readParam(params, "etat") ? "Aucune licence ne correspond à ta recherche." : "Aucune licence pour l'instant : elles apparaissent dès qu'un VST est payé, offert ou en essai."}</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {clients.map((c) => (
              <li key={c.id}>
                <details className="group py-3" open={clients.length === 1}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 [&::-webkit-details-marker]:hidden">
                    <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {c.name}{" "}
                        <span className="font-normal text-muted">
                          · {c.licenses.length} licence{c.licenses.length > 1 ? "s" : ""}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted">{c.email}</p>
                    </div>
                    <ul className="flex w-full flex-wrap gap-1.5 pl-7 sm:w-auto sm:pl-0">
                      {c.licenses.map((l) => {
                        const trial = l.trialEndsAt && !l.revokedAt;
                        return (
                          <li
                            key={l.id}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              l.revokedAt
                                ? "bg-red-500/10 text-red-300 line-through"
                                : trial
                                  ? "bg-amber-400/10 text-amber-200"
                                  : "bg-white/[0.06]"
                            }`}
                            title={l.revokedAt ? "Désactivée" : trial ? "Essai" : undefined}
                          >
                            {shortName(l.productName)}
                          </li>
                        );
                      })}
                    </ul>
                  </summary>
                  <ul className="mt-3 space-y-3 border-l border-white/10 pl-4 sm:ml-2">
                    {c.licenses.map((l) => (
                      <li key={l.id} className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{l.productName}</p>
                            <p className="text-xs text-muted">
                              créée le {date.format(l.createdAt)}
                              {l.revokedAt && <span className="text-red-300"> · désactivée</span>}
                              {l.trialEndsAt &&
                                (l.trialEndsAt > now ? ` · essai jusqu'au ${date.format(l.trialEndsAt)}` : " · essai terminé")}
                              {l.trialStartedAt && !l.trialEndsAt && " · acheté après essai"}
                              {` · ${l.activations.length} / ${l.maxActivations} ordinateur${l.maxActivations > 1 ? "s" : ""}`}
                            </p>
                            <code className="select-all break-all font-mono text-xs">{l.key}</code>
                          </div>
                          <AdminLicenseActions licenseId={l.id} revoked={!!l.revokedAt} maxActivations={l.maxActivations} />
                        </div>
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
                </details>
              </li>
            ))}
          </ul>
        )}
        <Pagination basePath="/admin/licences" params={params} page={page} total={total} />
      </Card>
    </DashboardShell>
  );
}

/** « Swell FET 76 » → « FET 76 » : les pastilles restent courtes. */
function shortName(name: string) {
  return name.replace(/^swell\s*[-–]?\s*/i, "") || name;
}
