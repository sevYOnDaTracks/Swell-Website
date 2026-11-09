import { Suspense } from "react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { OrderActions } from "@/components/orders/OrderActions";
import { getAdminOrders, getPaymentOptions } from "@/lib/orders";
import { formatFcfa, isMobileMethod, METHOD_LABELS } from "@/lib/payments";
import { requireAdmin } from "@/lib/session";
import { formatPrice } from "@/lib/shop-format";

export const metadata = { title: "Commandes — Swell" };

const STATUS_LABELS = { pending: "En attente", paid: "Payée", cancelled: "Annulée" } as const;

export default function OrdersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}

async function OrdersContent() {
  const admin = await requireAdmin();
  const orders = await getAdminOrders();
  const paymentsOpen = Object.values(getPaymentOptions()).some(Boolean);

  return (
    <DashboardShell user={admin} title="Commandes" subtitle="Vérifie la référence et le montant sur ton compte, puis valide le paiement.">
      {!paymentsOpen && (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
          Les paiements sont fermés : les clients ne peuvent pas commander tant que PAYPAL_EMAIL, WAVE_NUMBER, ORANGE_MONEY_NUMBER, ou BANK_TRANSFER_IBAN et BANK_TRANSFER_HOLDER, ne sont pas réglés sur le serveur.
        </p>
      )}
      <Card title="Paiements">
        {orders.length === 0 ? (
          <EmptyState>Aucune commande pour l&apos;instant.</EmptyState>
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
      </Card>
    </DashboardShell>
  );
}
