import { formatFcfa, isMobileMethod, METHOD_LABELS } from "@/lib/payments";
import { formatPrice } from "@/lib/shop-format";
import { ProofUpload } from "./ProofUpload";

type Props = {
  order: { id: string; method: string; totalCents: number; reference: string; proofSentAt?: Date | null };
  paypalEmail: string | null;
  transfer: { iban: string; holder: string } | null;
  mobile?: { wave: string | null; orange_money: string | null; name: string | null };
  wero?: { id: string; name: string | null } | null;
  /** Mobile money : demande la capture du paiement (commandes). Faux pour les réservations. */
  withProof?: boolean;
};

/** Ce que le client doit faire pour régler une commande en attente. */
export function PaymentInstructions({ order, paypalEmail, transfer, mobile, wero, withProof = true }: Props) {
  const mobileNumber = isMobileMethod(order.method) ? mobile?.[order.method] : null;
  if (mobileNumber) {
    return (
      <>
        <ol className="space-y-1.5">
          <li>
            <span className="text-muted">1. Envoie </span>
            <span className="font-semibold">{formatFcfa(order.totalCents)}</span>
            <span className="text-muted"> ({formatPrice(order.totalCents)}) par {METHOD_LABELS[order.method]} au </span>
            <span className="font-mono font-semibold">{mobileNumber}</span>
            {mobile?.name && <span className="text-muted"> ({mobile.name})</span>}
          </li>
          <li>
            <span className="text-muted">2. En message, si possible : </span>
            <span className="font-mono font-semibold">{order.reference}</span>
          </li>
          {withProof && <li className="text-muted">3. Fais une capture d&apos;écran de la confirmation et envoie-la ici.</li>}
        </ol>
        {withProof && <ProofUpload orderId={order.id} sentAt={order.proofSentAt ?? null} />}
      </>
    );
  }
  if (order.method === "wero" && wero) {
    return (
      <>
        <dl className="space-y-1">
          <div>
            <dt className="inline text-muted">Wero : </dt>
            <dd className="inline break-all font-mono">{wero.id}</dd>
            {wero.name && <dd className="inline text-muted"> ({wero.name})</dd>}
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
        <p className="mt-2 text-xs text-muted">Ouvre l&apos;app de ta banque (ou l&apos;app Wero), choisis Wero et envoie le montant à ce numéro.</p>
      </>
    );
  }
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
