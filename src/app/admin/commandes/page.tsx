import { Suspense } from "react";
import { ListSearch, Pagination } from "@/components/admin/ListControls";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { PAGE_SIZE, readPage, readParam } from "@/lib/admin-list";
import { OrderActions } from "@/components/orders/OrderActions";
import { getAdminOrders, getPaymentOptions } from "@/lib/orders";
import { formatFcfa, isMobileMethod, METHOD_LABELS } from "@/lib/payments";
import { requireAdmin } from "@/lib/session";
import { formatPrice } from "@/lib/shop-format";

export const metadata = { title: "Commandes — Swell" };

const STATUS_LABELS = { pending: "En attente", paid: "Payée", cancelled: "Annulée" } as const;

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
  const { orders, total } = await getAdminOrders({
    q: readParam(params, "q"),
    status: readParam(params, "statut"),
    method: readParam(params, "paiement"),
    limit: PAGE_SIZE,
    offset,
  });
  const filtered = !!(readParam(params, "q") || readParam(params, "statut") || readParam(params, "paiement"));
  const paymentsOpen = Object.values(getPaymentOptions()).some(Boolean);

  return (
    <DashboardShell user={admin} title="Commandes" subtitle="Vérifie la référence et le montant sur ton compte, puis valide le paiement.">
      {!paymentsOpen && (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
          Les paiements sont fermés : les clients ne peuvent pas commander tant que PAYPAL_EMAIL, WAVE_NUMBER, ORANGE_MONEY_NUMBER, ou BANK_TRANSFER_IBAN et BANK_TRANSFER_HOLDER, ne sont pas réglés sur le serveur.
        </p>
      )}
      <Card title="Paiements" action={<span className="text-xs text-muted">{total} commande{total > 1 ? "s" : ""}</span>}>
        <ListSearch
          basePath="/admin/commandes"
          params={params}
          placeholder="Référence, client, email ou produit"
          filters={[
            {
              name: "statut",
              label: "Statut",
              options: [
                { value: "", label: "Tous les statuts" },
                { value: "pending", label: "En attente" },
                { value: "proof", label: "Justificatif à vérifier" },
                { value: "paid", label: "Payées" },
                { value: "cancelled", label: "Annulées" },
                { value: "gift", label: "Offertes" },
              ],
            },
            {
              name: "paiement",
              label: "Paiement",
              options: [
                { value: "", label: "Tous les paiements" },
                { value: "wave", label: "Wave" },
                { value: "orange_money", label: "Orange Money" },
                { value: "paypal", label: "PayPal" },
                { value: "transfer", label: "Virement" },
              ],
            },
          ]}
        />
        {orders.length === 0 ? (
          <EmptyState>{filtered ? "Aucune commande ne correspond à ta recherche." : "Aucune commande pour l'instant."}</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {o.reference} · {formatPrice(o.totalCents)}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {o.method === "gift" ? "Offerte" : `${STATUS_LABELS[o.status]} · ${METHOD_LABELS[o.method] ?? o.method}`}
                      {isMobileMethod(o.method) && ` · ${formatFcfa(o.totalCents)}`}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    {o.clientName} ({o.clientEmail})
                  </p>
                  <p className="text-sm text-muted">
                    {o.items.map((i) => i.name).join(", ")}
                    {o.promoCode && ` · code ${o.promoCode} (-${formatPrice(o.discountCents)})`}
                  </p>
                  {o.proofSentAt && (
                    <a
                      href={`/api/admin/orders/${o.id}/proof`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-neutral-200"
                    >
                      Justificatif reçu · voir la capture
                    </a>
                  )}
                  {o.status === "pending" && isMobileMethod(o.method) && !o.proofSentAt && (
                    <p className="mt-1 text-xs text-muted">En attente de la capture du paiement.</p>
                  )}
                </div>
                {o.status === "pending" && <OrderActions orderId={o.id} reference={o.reference} />}
              </li>
            ))}
          </ul>
        )}
        <Pagination basePath="/admin/commandes" params={params} page={page} total={total} />
      </Card>
    </DashboardShell>
  );
}
