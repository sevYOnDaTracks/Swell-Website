import Link from "next/link";
import { Suspense } from "react";
import { inArray } from "drizzle-orm";
import { ChevronRight, Download, FlaskConical, KeyRound, Music } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { PaymentInstructions } from "@/components/orders/PaymentInstructions";
import { LicenseKey } from "@/components/licenses/LicenseKey";
import { db } from "@/db";
import { product as productTable } from "@/db/schema";
import { getMyLicenses } from "@/lib/licenses";
import { getPaypalEmail, getPendingOrders, getPurchases, getTransferDetails } from "@/lib/orders";
import { formatBytes, formatPrice, productPath } from "@/lib/shop-format";
import { requireUser } from "@/lib/session";
import { SHOP_URL } from "@/lib/sites";

export const metadata = { title: "Mes plugins — Swell" };

const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const downloadButton =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200";

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
  const [purchases, pendingOrders, licenses] = await Promise.all([getPurchases(user.id), getPendingOrders(user.id), getMyLicenses(user.id)]);

  const licenseByProduct = new Map(licenses.flatMap((l) => (l.productId ? [[l.productId, l] as const] : [])));
  const plugins = purchases.filter((p) => p.type === "vst");
  const sounds = purchases.filter((p) => p.type !== "vst");
  const trials = licenses.filter((l) => l.trialEndsAt);
  const trialIds = trials.flatMap((t) => (t.productId ? [t.productId] : []));
  const trialProducts = trialIds.length
    ? await db
        .select({ id: productTable.id, slug: productTable.slug, type: productTable.type, available: productTable.downloadFile })
        .from(productTable)
        .where(inArray(productTable.id, trialIds))
    : [];
  const now = new Date();
  const transfer = getTransferDetails();
  const paypalEmail = getPaypalEmail();
  const nothing = plugins.length + sounds.length + trials.length + pendingOrders.length === 0;

  return (
    <DashboardShell user={user} title="Mes plugins" subtitle="Tes plugins, leurs clés de licence et les ordinateurs activés, tes essais et tes sons.">
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
                  <PaymentInstructions order={o} paypalEmail={paypalEmail} transfer={transfer} />
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
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name}</p>
                        <p className="text-xs text-muted">
                          {p.paidAt ? `Depuis le ${longDate.format(p.paidAt)}` : null}
                          {p.downloadSize ? ` · ${formatBytes(p.downloadSize)}` : null}
                        </p>
                      </div>
                      {p.productId && p.available ? (
                        <a href={`/api/downloads/${p.productId}`} className={downloadButton}>
                          <Download size={15} /> Télécharger
                        </a>
                      ) : (
                        <span className="shrink-0 text-xs text-muted">Bientôt disponible</span>
                      )}
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
                      <div className="flex shrink-0 items-center gap-2">
                        {p && (
                          <Link href={productPath(p)} className="rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10">
                            Acheter
                          </Link>
                        )}
                        {running && p?.available && (
                          <a href={`/api/downloads/${p.id}`} className={downloadButton}>
                            <Download size={15} /> Télécharger
                          </a>
                        )}
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
            title="Sons & instrumentales"
            action={
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Music size={14} /> {sounds.length}
              </span>
            }
          >
            <ul className="space-y-2">
              {sounds.map((p) => (
                <li key={p.itemId} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-background/40 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    {p.downloadSize ? <p className="text-xs text-muted">{formatBytes(p.downloadSize)}</p> : null}
                  </div>
                  {p.productId && p.available ? (
                    <a href={`/api/downloads/${p.productId}`} className={downloadButton}>
                      <Download size={15} /> Télécharger
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-muted">Indisponible</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {nothing && (
          <p className="text-center text-sm text-muted">
            Les plugins achetés, offerts ou en essai arrivent ici avec leur clé de licence, prête à coller dans le plugin.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
