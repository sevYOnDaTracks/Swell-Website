"use client";

import { useTransition } from "react";
import { cancelOrder, markOrderPaid } from "@/app/actions/orders";

/** Boutons de l'admin sur une commande en attente de virement. */
export function OrderActions({ orderId, reference }: { orderId: string; reference: string }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`Confirmer la réception du virement ${reference} ? Le client aura accès à ses fichiers.`)) start(() => markOrderPaid(orderId));
        }}
        className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
      >
        Virement reçu
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(`Annuler la commande ${reference} ?`)) start(() => cancelOrder(orderId));
        }}
        className="rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
      >
        Annuler
      </button>
    </div>
  );
}
