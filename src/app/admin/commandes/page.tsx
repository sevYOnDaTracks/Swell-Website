import Link from "next/link";
import { Suspense } from "react";
import { Crown, Gift, ImageIcon } from "lucide-react";
import { ListSearch, Pagination } from "@/components/admin/ListControls";
import { DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton";
import { OrderActions } from "@/components/orders/OrderActions";
import { listHref, PAGE_SIZE, readPage, readParam } from "@/lib/admin-list";
import { getAdminOrderCounts, getAdminOrders, getPaymentOptions } from "@/lib/orders";
import { formatFcfa, isMobileMethod, METHOD_LABELS } from "@/lib/payments";
import { requireAdmin } from "@/lib/session";
import { formatPrice } from "@/lib/shop-format";

export const metadata = { title: "Commandes — Swell" };

// Onglets de la liste. Par défaut : les commandes à traiter (en attente de paiement).
const TABS = [
  { value: "pending", label: "À traiter" },
  { value: "proof", label: "Capture reçue" },
  { value: "paid", label: "Payées" },
  { value: "cancelled", label: "Annulées" },
  { value: "gift", label: "Offertes" },
  { value: "all", label: "Toutes" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const STATUS = {
  pending: { label: "En attente", className: "bg-amber-300 text-black" },
  paid: { label: "Payée", className: "bg-white/10 text-foreground" },
  cancelled: { label: "Annulée", className: "bg-white/5 text-muted line-through" },
} as const;

const dateTime = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** « il y a 3 h », « il y a 2 j » : l'ancienneté d'une commande en attente. */
function ago(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export default function OrdersPage({ searchParams }: PageProps<"/admin/commandes">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OrdersContent({ searchParams }: Pick<PageProps<"/admin/commandes">, "searchParams">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const { page, offset } = readPage(params);
  const asked = readParam(params, "statut");
  const tab: Tab = TABS.some((t) => t.value === asked) ? (asked as Tab) : "pending";
  const q = readParam(params, "q");
  const method = readParam(params, "paiement");
  const [{ orders, total }, counts] = await Promise.all([
    getAdminOrders({ q, status: tab === "all" ? "" : tab, method, limit: PAGE_SIZE, offset }),
    getAdminOrderCounts(),
  ]);
  const paymentsOpen = Object.values(getPaymentOptions()).some(Boolean);
  // Les onglets gardent la recherche et le filtre de paiement, et repartent de la première page.
  const tabParams = { ...params, page: undefined };

  return (
    <DashboardShell user={admin} title="Commandes" subtitle="Vérifie la référence et le montant sur ton compte, puis valide le paiement.">
      {!paymentsOpen && (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
          Les paiements sont fermés : les clients ne peuvent pas commander tant que PAYPAL_EMAIL, WERO_NUMBER, WAVE_NUMBER, ORANGE_MONEY_NUMBER, ou
          BANK_TRANSFER_IBAN et BANK_TRANSFER_HOLDER, ne sont pas réglés sur le serveur.
        </p>
      )}

      <nav aria-label="Statut des commandes" className="mb-5 flex gap-1 overflow-x-auto border-b border-white/10 [scrollbar-width:none]">
        {TABS.map((t) => {
          const n = counts[t.value];
          const active = tab === t.value;
          return (
            <Link
              key={t.value}
              href={listHref("/admin/commandes", tabParams, { statut: t.value === "pending" ? null : t.value })}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                active ? "border-white text-foreground" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-px text-xs tabular-nums ${
                  (t.value === "pending" || t.value === "proof") && n > 0 ? "bg-amber-300 font-semibold text-black" : "bg-white/10 text-muted"
                }`}
              >
                {n}
              </span>
            </Link>
          );
        })}
      </nav>

      <ListSearch
        basePath="/admin/commandes"
        params={params}
        placeholder="Référence, client, email ou produit"
        hidden={tab === "pending" ? {} : { statut: tab }}
        filters={[
          {
            name: "paiement",
            label: "Paiement",
            options: [
              { value: "", label: "Tous les paiements" },
              { value: "wave", label: "Wave" },
              { value: "orange_money", label: "Orange Money" },
              { value: "paypal", label: "PayPal" },
              { value: "wero", label: "Wero" },
              { value: "transfer", label: "Virement" },
            ],
          },
        ]}
      />

      {orders.length === 0 ? (
        <EmptyState>
          {q || method
            ? "Aucune commande ne correspond à ta recherche."
            : tab === "pending"
              ? "Rien à traiter : aucun paiement en attente."
              : tab === "proof"
                ? "Aucune capture de paiement à vérifier."
                : "Aucune commande ici pour l'instant."}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => {
            const mobile = isMobileMethod(o.method);
            const subscription = o.items.some((i) => i.subscriptionDays);
            const status = STATUS[o.status];
            return (
              <li
                key={o.id}
                className={`grid gap-4 rounded-2xl border bg-surface p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_150px_170px_auto] lg:items-center ${
                  o.status === "pending" ? (o.proofSentAt ? "border-amber-300/50" : "border-white/15") : "border-white/5"
                }`}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{o.clientName}</span>
                    {o.method === "gift" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                        <Gift size={12} /> Offerte
                      </span>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                    )}
                    {subscription && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-xs text-muted">
                        <Crown size={12} /> Abonnement
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted">{o.clientEmail}</p>
                  <p className="mt-2 text-sm">
                    {o.items.map((i) => i.name).join(", ")}
                    {o.promoCode && <span className="text-muted"> · code {o.promoCode} (-{formatPrice(o.discountCents)})</span>}
                  </p>
                </div>

                <div className="lg:text-right">
                  <p className="text-xl font-bold tracking-tight tabular-nums">{o.method === "gift" ? "Offert" : formatPrice(o.totalCents)}</p>
                  {mobile && <p className="text-sm text-muted tabular-nums">{formatFcfa(o.totalCents)}</p>}
                </div>

                <div className="text-sm">
                  <p className="font-medium">{METHOD_LABELS[o.method] ?? o.method}</p>
                  <p className="font-mono text-xs tracking-wide text-muted">{o.reference}</p>
                  <p className="mt-1 text-xs text-muted" title={dateTime.format(o.createdAt)}>
                    {o.status === "pending" ? ago(o.createdAt) : o.paidAt ? `Payée le ${dateTime.format(o.paidAt)}` : dateTime.format(o.createdAt)}
                  </p>
                </div>

                <div className="flex flex-col gap-2 lg:items-end">
                  {o.proofSentAt ? (
                    <a
                      href={`/api/admin/orders/${o.id}/proof`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-amber-300/10"
                    >
                      <ImageIcon size={15} /> Voir la capture
                    </a>
                  ) : (
                    o.status === "pending" && mobile && <p className="text-xs text-muted">Capture pas encore envoyée</p>
                  )}
                  <div className="flex items-center gap-2 lg:justify-end">
                    {o.status === "pending" && <OrderActions orderId={o.id} reference={o.reference} />}
                    <DeleteOrderButton
                      orderId={o.id}
                      reference={o.reference}
                      clientName={o.clientName}
                      amount={o.method === "gift" ? "offerte" : formatPrice(o.totalCents)}
                      items={o.items.map((i) => i.name)}
                      status={o.status}
                      gift={o.method === "gift"}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4">
        <Pagination basePath="/admin/commandes" params={params} page={page} total={total} />
      </div>
    </DashboardShell>
  );
}
