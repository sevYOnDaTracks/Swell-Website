import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ProductCover } from "@/components/shop/ProductCard";
import { PreviewButton } from "@/components/shop/PreviewButton";
import { getProductBySlug } from "@/lib/shop";
import { fileFormat, formatBytes, formatLabel, formatPrice, mediaUrl, platformLabel, productTypeLabels } from "@/lib/shop-format";
import { Monitor } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">) {
  const product = await getProductBySlug((await params).slug);
  return product
    ? { title: `${product.name} — Swell`, description: product.shortDescription || undefined }
    : { title: "Produit introuvable — Swell" };
}

export default function ProductPage({ params }: PageProps<"/boutique/[slug]">) {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/boutique" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={16} /> Boutique
        </Link>
        <Suspense fallback={<div className="mt-6 aspect-[2/1] animate-pulse rounded-2xl bg-white/5" />}>
          <ProductDetail params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function ProductDetail({ params }: Pick<PageProps<"/boutique/[slug]">, "params">) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  return (
    <article className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/5 bg-surface">
        <ProductCover product={product} sizes="(min-width: 1024px) 50vw, 100vw" eager />
      </div>

      <div>
        <p className="text-sm text-muted">{productTypeLabels[product.type]}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
        {product.shortDescription && <p className="mt-3 text-lg text-muted">{product.shortDescription}</p>}

        {(product.platforms.length > 0 || product.formats.length > 0) && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm">
            <Monitor size={18} className="mt-0.5 shrink-0 text-muted" />
            <div>
              {product.platforms.length > 0 && (
                <p>
                  <span className="text-muted">Compatible :</span> {product.platforms.map(platformLabel).join(" · ")}
                </p>
              )}
              {product.formats.length > 0 && (
                <p className="mt-0.5">
                  <span className="text-muted">Formats :</span> {product.formats.map(formatLabel).join(", ")}
                </p>
              )}
            </div>
          </div>
        )}

        {product.genres.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {product.genres.map((g) => (
              <li key={g}>
                <Link
                  href={`/boutique?genre=${encodeURIComponent(g)}`}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted transition-colors hover:border-white/30 hover:text-foreground"
                >
                  {g}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {product.previewFile && (
          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-white/5 bg-surface p-4">
            <PreviewButton src={mediaUrl(product.previewFile)} label={product.name} size="lg" />
            <div>
              <p className="font-medium">Écouter l&apos;extrait</p>
              <p className="text-sm text-muted">Aperçu du rendu du pack</p>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-surface p-5">
          <p className="text-3xl font-bold tracking-tight">{formatPrice(product.priceCents)}</p>
          {product.downloadName && (
            <p className="mt-1 text-sm text-muted">
              Téléchargement : {fileFormat(product.downloadName)}
              {product.downloadSize ? ` · ${formatBytes(product.downloadSize)}` : ""}
            </p>
          )}
          <AddToCartButton productId={product.id} />
          <p className="mt-3 text-xs text-muted">Paiement sécurisé et téléchargement immédiat depuis ton espace, très bientôt.</p>
        </div>

        {product.description && (
          <div className="mt-8">
            <h2 className="font-semibold">Description</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{product.description}</p>
          </div>
        )}
      </div>
    </article>
  );
}
