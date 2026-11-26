import { formatPrice, saleBadge } from "@/lib/shop-format";

const SIZES = {
  sm: { price: "text-sm font-semibold sm:text-base", was: "text-xs sm:text-sm", badge: "text-[10px] px-1.5" },
  lg: { price: "text-3xl font-bold tracking-tight", was: "text-lg", badge: "text-xs px-2 py-0.5" },
} as const;

/** Prix d'un produit, avec l'ancien prix barré et la remise quand un prix promo est en cours. */
export function PriceTag({
  priceCents,
  compareAtCents,
  size = "sm",
  className = "",
}: {
  priceCents: number;
  compareAtCents?: number | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  if (!compareAtCents) return <span className={`${s.price} ${className}`}>{formatPrice(priceCents)}</span>;
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <span className={s.price}>{formatPrice(priceCents)}</span>
      <s className={`${s.was} text-muted`} aria-label={`au lieu de ${formatPrice(compareAtCents)}`}>
        {formatPrice(compareAtCents)}
      </s>
      <span className={`${s.badge} self-center rounded-full bg-white font-semibold text-black`}>{saleBadge(priceCents, compareAtCents)}</span>
    </span>
  );
}
