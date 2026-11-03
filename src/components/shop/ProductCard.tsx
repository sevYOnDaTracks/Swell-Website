import Image from "next/image";
import Link from "next/link";
import { AudioLines, Drum, Package, Piano, SlidersVertical } from "lucide-react";
import type { ProductType } from "@/db/schema";
import { formatPrice, mediaUrl, PLATFORMS, productTypeLabels } from "@/lib/shop-format";
import { PreviewButton } from "./PreviewButton";

export const TYPE_ICONS: Record<ProductType, typeof Drum> = {
  vst: Piano,
  drumkit: Drum,
  samplepack: Package,
  preset: SlidersVertical,
  instrumental: AudioLines,
};

type CardProduct = {
  slug: string;
  name: string;
  type: ProductType;
  shortDescription: string;
  priceCents: number;
  coverFile: string | null;
  previewFile: string | null;
  platforms?: string[];
};

export function ProductCover({ product, sizes, eager }: { product: CardProduct; sizes: string; eager?: boolean }) {
  const Icon = TYPE_ICONS[product.type];
  return product.coverFile ? (
    <Image src={mediaUrl(product.coverFile)} alt={product.name} fill sizes={sizes} unoptimized loading={eager ? "eager" : "lazy"} className="object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 via-surface-2 to-white/[0.02]">
      <Icon size={44} className="text-white/70" />
    </div>
  );
}

export function ProductCard({ product }: { product: CardProduct }) {
  return (
    <Link
      href={`/boutique/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-white/5 bg-surface transition-colors hover:border-white/25"
    >
      <div className="relative aspect-square overflow-hidden">
        <div className="relative h-full w-full transition-transform duration-500 group-hover:scale-[1.03]">
          <ProductCover product={product} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        </div>
        <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs text-white/90 backdrop-blur">
            {productTypeLabels[product.type]}
          </span>
          {PLATFORMS.filter((p) => product.platforms?.includes(p.value)).map((p) => (
            <span key={p.value} title={`Compatible ${p.label}`} className="rounded-full bg-white px-2 py-1 text-xs font-medium text-black">
              {p.short}
            </span>
          ))}
        </div>
        {product.previewFile && (
          <div className="absolute bottom-3 right-3">
            <PreviewButton src={mediaUrl(product.previewFile)} label={product.name} />
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{product.name}</h3>
          {product.shortDescription && <p className="mt-1 line-clamp-2 text-sm text-muted">{product.shortDescription}</p>}
        </div>
        <span className="shrink-0 font-semibold">{formatPrice(product.priceCents)}</span>
      </div>
    </Link>
  );
}
