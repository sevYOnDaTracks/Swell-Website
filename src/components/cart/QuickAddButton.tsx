"use client";

import { Check, ShoppingCartPlus } from "lucide-react";
import { openCart, useCart } from "@/lib/cart";

/** Ajout au panier depuis une carte ou une liste, sans ouvrir la fiche : le panneau du panier s'ouvre. */
export function QuickAddButton({ productId, name, variant = "overlay" }: { productId: string; name: string; variant?: "overlay" | "inline" }) {
  const cart = useCart();
  const inCart = cart.has(productId);

  return (
    <button
      type="button"
      onClick={(e) => {
        // Le bouton est dans le lien de la carte : on ne suit pas le lien.
        e.preventDefault();
        e.stopPropagation();
        if (!inCart) cart.add(productId);
        openCart();
      }}
      aria-label={inCart ? `${name} est dans ton panier : voir le panier` : `Ajouter ${name} au panier`}
      title={inCart ? "Dans ton panier" : "Ajouter au panier"}
      className={
        variant === "overlay"
          ? `flex h-10 w-10 items-center justify-center rounded-full shadow-lg backdrop-blur transition-colors ${
              inCart ? "bg-black/70 text-white" : "bg-white text-black hover:bg-neutral-200"
            }`
          : `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              inCart ? "border border-white/20 text-foreground" : "bg-primary text-black hover:bg-neutral-200"
            }`
      }
    >
      {inCart ? <Check size={18} /> : <ShoppingCartPlus size={18} />}
    </button>
  );
}
