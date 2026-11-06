"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Landmark, Loader2, Lock, ShoppingCart, Wallet, X } from "lucide-react";
import { getCartProducts } from "@/app/actions/cart";
import { createOrder } from "@/app/actions/orders";
import { useCart } from "@/lib/cart";
import { formatPrice, mediaUrl, productTypeLabels } from "@/lib/shop-format";

type CartProduct = Awaited<ReturnType<typeof getCartProducts>>[number];

export function CartView({ transferOpen, paypalOpen }: { transferOpen: boolean; paypalOpen: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const [waived, setWaived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordering, startOrder] = useTransition();
  const [products, setProducts] = useState<CartProduct[] | null>(null);
  const key = cart.ids.join(",");

  useEffect(() => {
    let active = true;
    getCartProducts(key ? key.split(",") : []).then((rows) => {
      if (active) setProducts(rows);
    });
    return () => {
      active = false;
    };
  }, [key]);

  if (products === null) {
    return <div className="mt-10 h-40 animate-pulse rounded-2xl border border-white/5 bg-surface" />;
  }

  // Dans l'ordre d'ajout ; un produit retiré de la boutique disparaît du panier.
  const items = cart.ids.flatMap((id) => products.filter((p) => p.id === id));
  const total = items.reduce((sum, p) => sum + p.priceCents, 0);
  const hasFreeItems = items.some((p) => p.priceCents === 0);

  function order(method: "transfer" | "paypal") {
    setError(null);
    startOrder(async () => {
      const result = await createOrder(items.map((p) => p.id), waived, method);
      if ("needsAccount" in result) {
        router.push("/inscription?next=%2Fpanier");
        return;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      result.paidIds.forEach(cart.remove);
      router.push("/compte");
    });
  }

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
        <ShoppingCart size={28} className="mx-auto text-muted" />
        <p className="mt-4 text-muted">Ton panier est vide.</p>
        <Link
          href="/boutique"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
        >
          Voir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <ul className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-surface">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-4 p-4">
            <Link href={`/boutique/${p.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              {p.coverFile && <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="80px" unoptimized className="object-cover" />}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/boutique/${p.slug}`} className="font-semibold hover:underline">
                {p.name}
              </Link>
              <p className="text-xs text-muted">{productTypeLabels[p.type]}</p>
              {p.shortDescription && <p className="mt-1 line-clamp-1 text-sm text-muted">{p.shortDescription}</p>}
            </div>
            <p className="shrink-0 font-semibold">{formatPrice(p.priceCents)}</p>
            <button
              type="button"
              onClick={() => cart.remove(p.id)}
              aria-label={`Retirer ${p.name} du panier`}
              className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-2xl border border-white/5 bg-surface p-5">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {items.length} article{items.length > 1 ? "s" : ""}
          </span>
          <button type="button" onClick={cart.clear} className="hover:text-foreground">
            Vider
          </button>
        </div>
        <p className="mt-4 flex items-baseline justify-between">
          <span className="text-sm text-muted">Total</span>
          <span className="text-2xl font-bold tracking-tight">{formatPrice(total)}</span>
        </p>
        {hasFreeItems && <p className="mt-3 text-xs text-muted">Les produits gratuits se téléchargent directement depuis leur fiche.</p>}
        {(transferOpen || paypalOpen) && total > 0 ? (
          <>
            <label className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-foreground/85">
              <input type="checkbox" checked={waived} onChange={(e) => setWaived(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-white" />
              <span>
                J&apos;accepte les{" "}
                <Link href="/cgv" className="underline underline-offset-2">
                  CGV
                </Link>
                , je demande l&apos;accès au téléchargement dès réception du paiement et je renonce à mon droit de rétractation une fois le téléchargement commencé.
              </span>
            </label>
            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}
            {paypalOpen && (
              <button
                type="button"
                onClick={() => order("paypal")}
                disabled={!waived || ordering}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                {ordering ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />} Commander et payer par PayPal
              </button>
            )}
            {transferOpen && (
              <button
                type="button"
                onClick={() => order("transfer")}
                disabled={!waived || ordering}
                className={`${paypalOpen ? "mt-2 border border-white/20 hover:bg-white/5" : "mt-4 bg-primary text-black hover:bg-neutral-200"} flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50`}
              >
                {ordering ? <Loader2 size={16} className="animate-spin" /> : <Landmark size={16} />} Commander par virement
              </button>
            )}
            <p className="mt-3 text-xs text-muted">Ta commande reçoit une référence. Tes fichiers arrivent dans ton espace dès que le paiement est vérifié.</p>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-black opacity-50"
            >
              <Lock size={16} /> Paiement bientôt disponible
            </button>
            <p className="mt-3 text-xs text-muted">Ton panier est gardé sur cet appareil en attendant l&apos;ouverture des paiements.</p>
          </>
        )}
        <Link href="/boutique" className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={14} /> Continuer mes achats
        </Link>
      </aside>
    </div>
  );
}
