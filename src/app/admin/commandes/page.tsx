import { Suspense } from "react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { OrderActions } from "@/components/orders/OrderActions";
import { getAdminOrders, getTransferDetails } from "@/lib/orders";
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
  const transferOpen = !!getTransferDetails();

  return (
    <DashboardShell user={admin} title="Commandes" subtitle="Vérifie la référence et le montant sur ton compte, puis valide le virement.">
      {!transferOpen && (
        <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
          Le paiement par virement est fermé : les clients ne peuvent pas commander tant que BANK_TRANSFER_IBAN et BANK_TRANSFER_HOLDER ne sont pas réglés sur le serveur.
        </p>
      )}
      <Card title="Virements">
        {orders.length === 0 ? (
          <EmptyState>Aucune commande pour l&apos;instant.</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {o.reference} · {formatPrice(o.totalCents)}
                    <span className="ml-2 text-xs font-normal text-muted">{STATUS_LABELS[o.status]}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {o.clientName} ({o.clientEmail})
                  </p>
                  <p className="text-sm text-muted">{o.items.map((i) => i.name).join(", ")}</p>
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
