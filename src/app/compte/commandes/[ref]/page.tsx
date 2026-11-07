import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { CancelOrderButton } from "@/components/orders/CancelOrderButton";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { PaymentInstructions } from "@/components/orders/PaymentInstructions";
import { getMyOrder, getPaypalEmail, getTransferDetails } from "@/lib/orders";
import { requireUser } from "@/lib/session";
import { formatPrice } from "@/lib/shop-format";

export const metadata = { title: "Ma commande — Swell" };

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
const METHODS = { paypal: "PayPal", transfer: "Virement bancaire", free: "Aucun (gratuit)" } as const;

export default function OrderPage({ params }: PageProps<"/compte/commandes/[ref]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OrderContent params={params} />
    </Suspense>
  );
}

async function OrderContent({ params }: Pick<PageProps<"/compte/commandes/[ref]">, "params">) {
  const user = await requireUser();
  const { ref } = await params;
  const order = await getMyOrder(user.id, decodeURIComponent(ref));
  if (!order) notFound();

  const subtotal = order.items.reduce((sum, i) => sum + i.priceCents, 0);
  const free = order.method === "free";

  return (
    <DashboardShell user={user} title={`Commande ${order.reference}`} subtitle={`Passée le ${longDate.format(order.createdAt)}`}>
      <Link href="/compte" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
        <ArrowLeft size={15} /> Retour à mon espace
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Détail" action={<OrderStatusBadge status={order.status} free={free} />}>
            <ul className="divide-y divide-white/5 text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <span className="min-w-0 font-medium">{i.name}</span>
                  <span className="shrink-0 tabular-nums">{i.priceCents === 0 ? "Gratuit" : formatPrice(i.priceCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-sm">
              {order.discountCents > 0 && (
                <>
                  <div className="flex justify-between gap-3 text-muted">
                    <dt>Sous-total</dt>
                    <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 text-muted">
                    <dt>
                      Code promo <span className="font-mono">{order.promoCode}</span>
                    </dt>
                    <dd className="tabular-nums">−{formatPrice(order.discountCents)}</dd>
                  </div>
                </>
              )}
              <div className="flex justify-between gap-3 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{order.totalCents === 0 ? "Gratuit" : formatPrice(order.totalCents)}</dd>
              </div>
            </dl>
          </Card>

          {order.status === "pending" && (
            <Card title="Paiement à effectuer">
              <div className="text-sm">
                <PaymentInstructions order={order} paypalEmail={getPaypalEmail()} transfer={getTransferDetails()} />
                <p className="mt-3 text-xs text-muted">
                  Le paiement est vérifié à la main : tes fichiers apparaîtront dans « Mes achats » dès qu&apos;il sera
                  confirmé, et tu recevras un email.
                </p>
              </div>
              <div className="mt-5 border-t border-white/5 pt-5">
                <CancelOrderButton orderId={order.id} reference={order.reference} />
              </div>
            </Card>
          )}

          {order.status === "paid" && (
            <Card title="Téléchargements">
              <p className="text-sm text-muted">
                Tes fichiers sont disponibles dans{" "}
                <Link href="/compte#achats" className="text-foreground underline underline-offset-4">
                  Mes achats
                </Link>
                .
              </p>
            </Card>
          )}

          {order.status === "cancelled" && (
            <Card title="Commande annulée">
              <p className="text-sm text-muted">
                Aucun paiement n&apos;est attendu pour cette commande. Si tu avais déjà payé, réponds à l&apos;email
                d&apos;annulation pour que nous réglions ça.{" "}
                <Link href="/boutique" className="text-foreground underline underline-offset-4">
                  Retour à la boutique
                </Link>
              </p>
            </Card>
          )}
        </div>

        <div className="self-start">
          <Card title="Informations">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Numéro de commande</dt>
                <dd className="font-mono font-semibold">{order.reference}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Date</dt>
                <dd>{longDate.format(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Moyen de paiement</dt>
                <dd>{METHODS[order.method]}</dd>
              </div>
              {order.paidAt && (
                <div>
                  <dt className="text-xs text-muted">{free ? "Validée le" : "Paiement reçu le"}</dt>
                  <dd>{longDate.format(order.paidAt)}</dd>
                </div>
              )}
              {order.status === "cancelled" && (
                <div>
                  <dt className="text-xs text-muted">Annulée le</dt>
                  <dd>{longDate.format(order.updatedAt)}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
