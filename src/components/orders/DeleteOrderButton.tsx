"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { deleteOrder } from "@/app/actions/orders";

/**
 * Supprimer une commande, avec une fenêtre de confirmation. Une commande payée ou offerte
 * explique ce que le client perd et demande de retaper sa référence.
 */
export function DeleteOrderButton({
  orderId,
  reference,
  clientName,
  amount,
  items,
  status,
  gift,
}: {
  orderId: string;
  reference: string;
  clientName: string;
  amount: string;
  items: string[];
  status: "pending" | "paid" | "cancelled";
  gift: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const granted = status === "paid";
  const ready = !granted || typed.trim().toUpperCase() === reference;

  function open() {
    setTyped("");
    setError(null);
    dialog.current?.showModal();
  }

  function confirm() {
    setError(null);
    start(async () => {
      const result = await deleteOrder(orderId, typed);
      if ("error" in result) return setError(result.error);
      dialog.current?.close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Supprimer la commande ${reference}`}
        title="Supprimer la commande"
        className="rounded-lg p-2 text-muted transition-colors hover:bg-white/10 hover:text-red-400"
      >
        <Trash2 size={16} />
      </button>

      <dialog
        ref={dialog}
        onClick={(e) => {
          if (e.target === dialog.current && !pending) dialog.current?.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/15 bg-surface p-0 text-foreground shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) confirm();
          }}
          className="p-6"
        >
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 rounded-full p-2 ${granted ? "bg-red-500/15 text-red-400" : "bg-white/10"}`}>
              {granted ? <AlertTriangle size={18} /> : <Trash2 size={18} />}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Supprimer la commande {reference} ?</h2>
              <p className="mt-1 text-sm text-muted">
                {clientName} · {amount} · {items.join(", ")}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm leading-relaxed">
            {granted ? (
              <>
                <p>
                  Cette commande est {gift ? "offerte" : "payée"}. La supprimer <strong>retire au client</strong> ce qu&apos;elle lui donnait :
                </p>
                <ul className="list-disc space-y-1 pl-5 text-foreground/85">
                  <li>le téléchargement de ces produits ;</li>
                  <li>leurs clés de licence (sauf s&apos;il les a par une autre commande, une démo ou un abonnement) ;</li>
                  <li>la période d&apos;abonnement, si c&apos;est un pass.</li>
                </ul>
                <p className="text-muted">À garder pour les tests et les erreurs : une vraie vente doit rester dans tes registres. C&apos;est définitif.</p>
                <label className="mt-3 block">
                  <span className="text-sm font-medium">
                    Retape <span className="font-mono">{reference}</span> pour confirmer
                  </span>
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    className="mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-white/50"
                  />
                </label>
              </>
            ) : (
              <p className="text-foreground/85">
                {status === "pending" ? "Elle attend encore son paiement : aucun accès n'a été donné au client." : "Elle est déjà annulée."} La suppression est définitive
                et le client n&apos;est pas prévenu.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} disabled={pending} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground">
              Garder la commande
            </button>
            <button
              type="submit"
              disabled={!ready || pending}
              className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-40"
            >
              {pending && <Loader2 size={15} className="animate-spin" />} Supprimer définitivement
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
