"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

/** Icône du panier dans le menu, avec le nombre d'articles. */
export function CartLink({ onClick }: { onClick?: () => void }) {
  const { count } = useCart();
  return (
    <Link
      href="/panier"
      onClick={onClick}
      aria-label={count ? `Panier (${count} article${count > 1 ? "s" : ""})` : "Panier"}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-foreground"
    >
      <ShoppingCart size={18} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
          {count}
        </span>
      )}
    </Link>
  );
}
