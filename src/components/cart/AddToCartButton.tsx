"use client";

import { Check, ShoppingBag } from "lucide-react";
import { openCart, useCart } from "@/lib/cart";

export function AddToCartButton({ productId }: { productId: string }) {
  const cart = useCart();

  if (cart.has(productId)) {
    return (
      <button
        type="button"
        onClick={openCart}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
      >
        <Check size={16} /> Dans ton panier · Voir le panier
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        cart.add(productId);
        openCart(); // le panneau glisse depuis la droite, sans changer de page
      }}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
    >
      <ShoppingBag size={16} /> Ajouter au panier
    </button>
  );
}
