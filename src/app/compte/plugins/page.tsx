import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { inArray } from "drizzle-orm";
import { AudioLines, ChevronRight, Crown, Download, FlaskConical, KeyRound, Music, Piano } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { PaymentInstructions } from "@/components/orders/PaymentInstructions";
import { LicenseKey } from "@/components/licenses/LicenseKey";
import { DownloadChoice } from "@/components/shop/DownloadChoice";
import { ExternalLinkButton } from "@/components/shop/ExternalLinkButton";
import { db } from "@/db";
import { product as productTable } from "@/db/schema";
import { getMyLicenses } from "@/lib/licenses";
import { getMobileMoney, getPaypalEmail, getWero, getPendingOrders, getPurchases, getTransferDetails, orderSite } from "@/lib/orders";
import { formatBytes, formatPrice, mediaUrl, productPath } from "@/lib/shop-format";
import { requireUser } from "@/lib/session";
import { formulaIncludes, SUBSCRIPTION_STATE_LABELS } from "@/lib/subscription-plans";
import { getSubscription, getSubscriptionSettings, hasAccess } from "@/lib/subscriptions";
import { currentSite } from "@/lib/site-server";
import { MIX_URL, SHOP_URL } from "@/lib/sites";

export async function generateMetadata() {
  return { title: (await currentSite()) === "mix" ? "Mes instrumentales — Swell" : "Mes plugins — Swell" };
}

const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const downloadButton =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200";

/** Visuel du produit (ou une icône s'il n'en a pas). */
function Cover({ file, size = "lg", Icon = Piano }: { file: string | null | undefined; size?: "lg" | "sm"; Icon?: typeof Piano }) {
  const box = size === "lg" ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12";
  return (
    <div className={`relative ${box} shrink-0 overflow-hidden rounded-xl bg-surface-2`}>
      {file ? (
        <Image src={mediaUrl(file)} alt="" fill sizes="80px" unoptimized className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 via-surface-2 to-white/[0.02]">
          <Icon size={size === "lg" ? 26 : 20} className="text-white/60" />
        </div>
      )}
    </div>
  );
}

export default function MyPluginsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MyPluginsContent />
    </Suspense>
  );
}

// Plugins achetés ou offerts (téléchargement, clé de licence, ordinateurs activés), essais,
// sons et instrumentales, et commandes en attente de paiement.
async function MyPluginsContent() {
  const user = await requireUser();
  // Boutique : plugins, essais et sons. Mix : instrumentales. Chaque site ses commandes en attente.
  const site = await currentSite();
  const mix = site === "mix";
  const [purchases, allPending, licenses, sub, subSettings] = await Promise.all([
    getPurchases(user.id),
    getPendingOrders(user.id),
    getMyLicenses(user.id),
    mix ? null : getSubscription(user.id),
    getSubscriptionSettings(),
  ]);
  const pendingOrders = allPending.filter((o) => orderSite(o) === site);

  const licenseByProduct = new Map(licenses.flatMap((l) => (l.productId ? [[l.productId, l] as const] : [])));
  const plugins = mix ? [] : purchases.filter((p) => p.type === "vst");
  const sounds = purchases.filter((p) => (mix ? p.type === "instrumental" : p.type !== "vst" && p.type !== "instrumental"));
  const trials = mix ? [] : licenses.filter((l) => l.trialEndsAt && !l.viaSubscription);
  // Plugins de l'abonnement (ceux achetés à l'unité restent dans « Mes plugins » avec leur clé définitive).
  // Formules en cours (essai, actif ou marge) : elles ouvrent le téléchargement et les clés de leurs plugins.
  const openFormulas = (sub?.formulas ?? []).filter((f) => hasAccess(f.state) && f.formula);
  const pluginOpen = (productId: string | null) => !!productId && openFormulas.some((f) => formulaIncludes(f.formula!, productId));
  const everHad = (sub?.formulas ?? []).flatMap((f) => (f.formula ? [f.formula] : []));
  const subLicenses = mix ? [] : licenses.filter((l) => l.viaSubscription && !!l.productId && everHad.some((f) => formulaIncludes(f, l.productId!)));
  const trialIds = [...trials, ...subLicenses].flatMap((t) => (t.productId ? [t.productId] : []));
  const trialProducts = trialIds.length
    ? await db
        .select({
          id: productTable.id,
          slug: productTable.slug,
          type: productTable.type,
          available: productTable.downloadFile,
          coverFile: productTable.coverFile,
          installerMacSize: productTable.installerMacSize,
          installerWinSize: productTable.installerWinSize,
          extraUrl: productTable.extraUrl,
          extraLabel: productTable.extraLabel,
        })
        .from(productTable)
        .where(inArray(productTable.id, trialIds))
    : [];
  const now = new Date();
  const transfer = getTransferDetails();
  const paypalEmail = getPaypalEmail();
  const nothing = plugins.length + sounds.length + trials.length + subLicenses.length + pendingOrders.length === 0;
  const showSubscription = !mix && !!sub && (sub.state !== "none" || subSettings.enabled);
  const stateStyle = (state: string) =>
    state === "grace" ? "bg-amber-300 text-black" : state === "active" || state === "trial" ? "bg-white text-black" : "bg-white/5 text-muted";

  return (
    <DashboardShell
      user={user}
      title={mix ? "Mes instrumentales" : "Mes plugins"}
      subtitle={mix ? "Tes prods achetées, prêtes à télécharger." : "Tes plugins, leurs clés de licence et les ordinateurs activés, tes essais et tes sons."}
    >
      <div className="space-y-4">
        {pendingOrders.length > 0 && (
          <Card title="En attente de paiement" action={<span className="text-xs text-muted">{pendingOrders.length}</span>}>
            {pendingOrders.map((o) => (
              <div key={o.id} className="mb-3 rounded-xl border border-white/15 bg-white/[0.04] p-4 text-sm last:mb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold">
                    Commande {o.reference} · {formatPrice(o.totalCents)}
                  </p>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-muted">{o.items.map((i) => i.name).join(", ")}</p>
                <div className="mt-3">
                  <PaymentInstructions order={o} paypalEmail={paypalEmail} transfer={transfer} mobile={getMobileMoney()} wero={getWero()} />
                </div>
                <p className="mt-3 text-xs text-muted">Tes fichiers et tes clés apparaîtront ici dès que le paiement sera vérifié.</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
                  <Link
                    href={`/compte/commandes/${o.reference}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10"
                  >
                    Voir le détail <ChevronRight size={14} />
                  </Link>
                  <CancelOrderButton orderId={o.id} reference={o.reference} />
                </div>
              </div>
            ))}
          </Card>
        )}

        {showSubscription && sub && (
          <Card
            title="Mon abonnement"
            action={<span className={`rounded-full px-2.5 py-0.5 text-xs ${stateStyle(sub.state)}`}>{SUBSCRIPTION_STATE_LABELS[sub.state]}</span>}
          >
            {sub.state === "none" ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  Les plugins Swell en abonnement prépayé
                  {subSettings.trialDays > 0 ? `, à essayer ${subSettings.trialDays} jours gratuitement` : ""}.
                </p>
                <Link href="/abonnement" className={downloadButton}>
                  <Crown size={15} /> Découvrir
                </Link>
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {sub.formulas.map((f) => (
                    <li key={f.formulaId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold">
                          {f.name}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-normal ${stateStyle(f.state)}`}>{SUBSCRIPTION_STATE_LABELS[f.state]}</span>
                        </p>
                        <p className="text-sm text-muted">
                          {f.state === "trial" && `Essai gratuit jusqu'au ${longDate.format(f.endsAt)}.`}
                          {f.state === "active" && `Jusqu'au ${longDate.format(f.endsAt)}.`}
                          {f.state === "grace" &&
                            `Terminé le ${longDate.format(f.endsAt)}. Tes plugins marchent encore jusqu'au ${longDate.format(f.accessEndsAt)} : renouvelle pour ne pas les perdre.`}
                          {f.state === "expired" && `Terminé le ${longDate.format(f.endsAt)}.`}
                        </p>
                      </div>
                      <Link href="/abonnement#formules" className={downloadButton}>
                        <Crown size={15} /> {f.state === "trial" || f.state === "expired" ? "M'abonner" : "Prolonger"}
                      </Link>
                    </li>
                  ))}
                </ul>
                {subLicenses.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {subLicenses.map((l) => {
                      const p = trialProducts.find((tp) => tp.id === l.productId);
                      const open = pluginOpen(l.productId);
                      return (
                        <li key={l.id} className="rounded-xl border border-white/5 bg-background/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-4">
                              <Cover file={p?.coverFile} size="sm" />
                              <p className="truncate font-semibold">{l.productName}</p>
                            </div>
                            {open && p?.available ? (
                              <DownloadChoice productId={p.id} installers={{ mac: p.installerMacSize, win: p.installerWinSize }} />
                            ) : p ? (
                              <Link href={productPath(p)} className="rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10">
                                Acheter
                              </Link>
                            ) : null}
                          </div>
                          {open && (
                            <LicenseKey licenseKey={l.key} maxActivations={l.maxActivations} activations={l.activations} revoked={!!l.revokedAt} />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </Card>
        )}

        {!mix && (
        <Card
          title="Mes plugins"
          action={
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <KeyRound size={14} /> {plugins.length} licence{plugins.length > 1 ? "s" : ""}
            </span>
          }
        >
          {plugins.length > 0 ? (
            <ul className="space-y-2">
              {plugins.map((p) => {
                const lic = p.productId ? licenseByProduct.get(p.productId) : undefined;
                return (
                  <li key={p.itemId} className="rounded-xl border border-white/5 bg-background/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-4">
                        <Cover file={p.coverFile} />
                        <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name}</p>
                        <p className="text-xs text-muted">
                          {p.paidAt ? `Depuis le ${longDate.format(p.paidAt)}` : null}
                          {p.downloadSize ? ` · ${formatBytes(p.downloadSize)}` : null}
                        </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {p.productId && p.available ? (
                          <DownloadChoice productId={p.productId} installers={{ mac: p.installerMacSize, win: p.installerWinSize }} />
                        ) : (
                          !p.extraUrl && <span className="shrink-0 text-xs text-muted">Bientôt disponible</span>
                        )}
                        <ExternalLinkButton url={p.extraUrl} label={p.extraLabel} />
                      </div>
                    </div>
                    {lic && <LicenseKey licenseKey={lic.key} maxActivations={lic.maxActivations} activations={lic.activations} revoked={!!lic.revokedAt} />}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState>
              Tes plugins et leurs clés de licence apparaîtront ici.{" "}
              <Link href={`${SHOP_URL}/boutique?type=vst`} className="text-foreground underline underline-offset-4">
                Voir les plugins
              </Link>
            </EmptyState>
          )}
        </Card>
        )}

        {trials.length > 0 && (
          <Card
            title="Mes essais"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <FlaskConical size={14} /> Démos
              </span>
            }
          >
            <ul className="space-y-2">
              {trials.map((t) => {
                const p = trialProducts.find((tp) => tp.id === t.productId);
                const running = t.trialEndsAt! > now;
                const daysLeft = Math.max(0, Math.ceil((t.trialEndsAt!.getTime() - now.getTime()) / 86_400_000));
                return (
                  <li key={t.id} className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-4">
                        <Cover file={p?.coverFile} />
                        <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {t.productName}{" "}
                          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-normal ${running ? "bg-white text-black" : "bg-white/5 text-muted"}`}>
                            {running ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}` : "Essai terminé"}
                          </span>
                        </p>
                        <p className="text-xs text-muted">
                          {running ? `Jusqu'au ${longDate.format(t.trialEndsAt!)}` : "Achète-le pour continuer : cette clé deviendra définitive."}
                        </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {p && (
                          <Link href={productPath(p)} className="rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10">
                            Acheter
                          </Link>
                        )}
                        {running && p?.available && (
                          <DownloadChoice productId={p.id} installers={{ mac: p.installerMacSize, win: p.installerWinSize }} />
                        )}
                        {running && <ExternalLinkButton url={p?.extraUrl} label={p?.extraLabel} />}
                      </div>
                    </div>
                    {running && <LicenseKey licenseKey={t.key} maxActivations={t.maxActivations} activations={t.activations} revoked={!!t.revokedAt} />}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {sounds.length > 0 && (
          <Card
            title={mix ? "Mes instrumentales" : "Sons"}
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Music size={14} /> {sounds.length}
              </span>
            }
          >
            <ul className="space-y-2">
              {sounds.map((p) => (
                <li key={p.itemId} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-background/40 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Cover file={p.coverFile} size="sm" Icon={p.type === "instrumental" ? AudioLines : Music} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      {p.downloadSize ? <p className="text-xs text-muted">{formatBytes(p.downloadSize)}</p> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {p.productId && p.available ? (
                      <a href={`/api/downloads/${p.productId}`} className={downloadButton}>
                        <Download size={15} /> Télécharger
                      </a>
                    ) : (
                      !p.extraUrl && <span className="shrink-0 text-xs text-muted">Indisponible</span>
                    )}
                    <ExternalLinkButton url={p.extraUrl} label={p.extraLabel} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {nothing && (
          <p className="text-center text-sm text-muted">
            {mix ? (
              <>
                Tes instrumentales arrivent ici après l&apos;achat.{" "}
                <Link href={`${MIX_URL}/instrumentales`} className="text-foreground underline underline-offset-4">
                  Écouter les prods
                </Link>
              </>
            ) : (
              "Les plugins achetés, offerts ou en essai arrivent ici avec leur clé de licence, prête à coller dans le plugin."
            )}
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
