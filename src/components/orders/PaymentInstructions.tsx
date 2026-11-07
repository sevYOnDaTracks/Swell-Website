import { formatPrice } from "@/lib/shop-format";

type Props = {
  order: { method: string; totalCents: number; reference: string };
  paypalEmail: string | null;
  transfer: { iban: string; holder: string } | null;
};

/** Ce que le client doit faire pour régler une commande en attente. */
export function PaymentInstructions({ order, paypalEmail, transfer }: Props) {
  if (order.method === "paypal" && paypalEmail) {
    return (
      <>
        <dl className="space-y-1">
          <div>
            <dt className="inline text-muted">Adresse PayPal : </dt>
            <dd className="inline break-all font-mono">{paypalEmail}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Montant : </dt>
            <dd className="inline font-semibold">{formatPrice(order.totalCents)}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Message à indiquer : </dt>
            <dd className="inline font-mono font-semibold">{order.reference}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">Choisis le paiement de biens ou services s&apos;il t&apos;est proposé.</p>
        <a
          href="https://www.paypal.com/myaccount/transfer/homepage/pay"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
        >
          Ouvrir PayPal
        </a>
      </>
    );
  }
  if (order.method === "transfer" && transfer) {
    return (
      <dl className="space-y-1">
        <div>
          <dt className="inline text-muted">Bénéficiaire : </dt>
          <dd className="inline">{transfer.holder}</dd>
        </div>
        <div>
          <dt className="inline text-muted">IBAN : </dt>
          <dd className="inline break-all font-mono">{transfer.iban}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Montant : </dt>
          <dd className="inline font-semibold">{formatPrice(order.totalCents)}</dd>
        </div>
        <div>
          <dt className="inline text-muted">Libellé à indiquer : </dt>
          <dd className="inline font-mono font-semibold">{order.reference}</dd>
        </div>
      </dl>
    );
  }
  return null;
}
