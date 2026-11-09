"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, X } from "lucide-react";
import { getPaymentOptions } from "@/app/actions/cart";
import type { PaymentOptions } from "@/lib/payments";
import { closeCart, useCart, useCartDrawer } from "@/lib/cart";
import { CartView } from "./CartView";

/** Panier en panneau latéral : glisse depuis la droite, sans quitter la page. */
export function CartDrawer({ browseHref }: { browseHref: string }) {
  const open = useCartDrawer();
  const { count } = useCart();
  const [payments, setPayments] = useState<PaymentOptions | null>(null);

  // Moyens de paiement relus à chaque ouverture : ils s'ouvrent en réglant le serveur.
  useEffect(() => {
    if (open) getPaymentOptions().then(setPayments);
  }, [open]);

  // Échap pour fermer, page figée derrière le panneau.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ton panier"
        inert={!open}
        className={`absolute top-0 right-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-background shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShoppingCart size={18} /> Ton panier <span className="text-sm font-normal text-muted">({count})</span>
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fermer le panier"
            className="rounded-full p-2 text-muted transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {open && payments ? (
            <CartView variant="drawer" payments={payments} browseHref={browseHref} />
          ) : (
            <div className="h-40 animate-pulse rounded-2xl border border-white/5 bg-surface" />
          )}
        </div>
      </aside>
    </div>
  );
}
