"use client";

import { useState, useTransition } from "react";
import { cancelMyOrder } from "@/app/actions/orders";

const button =
  "rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10 disabled:opacity-40";

/** Annulation d'une commande en attente, avec une confirmation affichée dans la page. */
export function CancelOrderButton({ orderId, reference }: { orderId: string; reference: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={button}>
        Annuler la commande
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby={`cancel-${orderId}`} className="w-full rounded-xl border border-white/20 bg-background/60 p-4">
      <p id={`cancel-${orderId}`} className="text-sm font-medium">
        Annuler la commande {reference} ?
      </p>
      <p className="mt-1 text-xs text-muted">
        Elle restera dans ton historique comme annulée. Si tu as déjà envoyé le paiement, n&apos;annule pas : il sera
        vérifié et tes fichiers apparaîtront ici.
      </p>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await cancelMyOrder(orderId);
              if ("error" in result) setError(result.error);
            })
          }
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-40"
        >
          {pending ? "Annulation…" : "Oui, annuler"}
        </button>
        <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={button}>
          Garder la commande
        </button>
      </div>
    </div>
  );
}
