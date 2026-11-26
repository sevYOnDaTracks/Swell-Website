import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Crown, Gauge, Monitor } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { FreeDownloadButton } from "@/components/shop/FreeDownloadButton";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CollapsibleDescription } from "@/components/shop/CollapsibleDescription";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { PreviewButton } from "@/components/shop/PreviewButton";
import { TrialButton } from "@/components/shop/TrialButton";
import { PriceTag } from "@/components/shop/PriceTag";
import { ProductReviews, RatingSummaryLink } from "@/components/reviews/ProductReviews";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, productJsonLd, productUrl } from "@/lib/seo";
import { getProductBySlug } from "@/lib/shop";
import { lowestMonthlyCents, SUBSCRIPTION_NAME } from "@/lib/subscription-plans";
import { getPublicSubscriptionSettings } from "@/lib/subscriptions";
import { fileFormat, formatBytes, formatLabel, formatPrice, isInstrumental, mediaUrl, platformLabel, productPath, productTypeLabels } from "@/lib/shop-format";
import { MIX_URL, SHOP_URL, type Site } from "@/lib/sites";

// Fiche produit, partagée par swell-audio.fr/boutique/<slug> (plugins, sons)
// et mix.swell-audio.fr/instrumentales/<slug> (instrumentales).

const saleEndFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

export async function productMetadata(slug: string) {
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produit introuvable — Swell", robots: { index: false } };
  return pageMeta({
    url: productUrl(product),
    title: `${product.name} — Swell`,
    description: product.shortDescription || undefined,
    image: product.coverFile ? `${SHOP_URL}${mediaUrl(product.coverFile)}` : undefined,
  });
}

export function ProductPage({ slug, site }: { slug: Promise<string>; site: Site }) {
  return (
    <>
      <Navbar site={site} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="mt-6 aspect-[2/1] animate-pulse rounded-2xl bg-white/5" />}>
          <ResolvedDetail slug={slug} site={site} />
        </Suspense>
      </main>
      <Footer site={site} />
    </>
  );
}

/** Rappel de l'abonnement sur la fiche d'un plugin, quand il est ouvert. */
async function AllAccessNote({ productId }: { productId: string }) {
  const settings = await getPublicSubscriptionSettings();
  const from = lowestMonthlyCents(settings);
  if (!settings.enabled || !from || settings.excludedProductIds.includes(productId)) return null;
  return (
    <Link
      href="/abonnement"
      className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-background/40 px-4 py-3 text-sm transition-colors hover:border-white/30"
    >
      <Crown size={18} className="shrink-0" />
      <span>
        Inclus dans <strong>{SUBSCRIPTION_NAME}</strong> avec tous les plugins Swell, dès {formatPrice(from)} par
        mois{settings.trialDays > 0 ? ` · ${settings.trialDays} jours d'essai gratuit` : ""}.
      </span>
    </Link>
  );
}

async function ResolvedDetail({ slug, site }: { slug: Promise<string>; site: Site }) {
  return <ProductDetail slug={await slug} site={site} />;
}

async function ProductDetail({ slug, site }: { slug: string; site: Site }) {
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const beat = isInstrumental(product.type);
  // Instrumentales sur mix.swell-audio.fr, le reste sur swell-audio.fr.
  if (beat && site === "shop") redirect(`${MIX_URL}/instrumentales/${product.slug}`);
  if (!beat && site === "mix") redirect(`${SHOP_URL}/boutique/${product.slug}`);
  const listHref = beat ? "/instrumentales" : "/boutique";

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <Link href={listHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> {beat ? "Instrumentales" : "Boutique"}
      </Link>
      <article className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery product={product} />

        <div>
          <p className="text-sm text-muted">{productTypeLabels[product.type]}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          {!beat && (
            <Suspense fallback={null}>
              <RatingSummaryLink productId={product.id} />
            </Suspense>
          )}
          {product.shortDescription && <p className="mt-3 text-lg text-muted">{product.shortDescription}</p>}

          {(product.platforms.length > 0 || product.formats.length > 0) && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm">
              <Monitor size={18} className="mt-0.5 shrink-0 text-muted" />
              <div>
                {product.platforms.length > 0 && (
                  <p>
                    <span className="text-muted">Compatible :</span> {product.platforms.map(platformLabel).join(" · ")}
                    {product.platforms.length === 1 && " uniquement"}
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

          {beat && (product.bpm || product.musicalKey) && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm">
              <Gauge size={18} className="shrink-0 text-muted" />
              <p>
                {product.bpm && (
                  <>
                    <span className="text-muted">Tempo :</span> {product.bpm} BPM
                  </>
                )}
                {product.bpm && product.musicalKey && <span className="text-muted"> · </span>}
                {product.musicalKey && (
                  <>
                    <span className="text-muted">Tonalité :</span> {product.musicalKey}
                  </>
                )}
              </p>
            </div>
          )}

          {product.genres.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {product.genres.map((g) => (
                <li key={g}>
                  <Link
                    href={`${listHref}?genre=${encodeURIComponent(g)}`}
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
                <p className="text-sm text-muted">{beat ? "Extrait de la prod" : "Aperçu du rendu du pack"}</p>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-surface p-5">
            <p>
              <PriceTag priceCents={product.priceCents} compareAtCents={product.compareAtCents} size="lg" />
            </p>
            {product.compareAtCents && (
              <p className="mt-1 text-sm font-medium text-foreground/90">
                Prix promo{product.saleEndsAt ? ` jusqu'au ${saleEndFormat.format(product.saleEndsAt)}` : ""}
              </p>
            )}
            {product.installerMacFile || product.installerWinFile ? (
              <p className="mt-1 text-sm text-muted">
                Installateur{" "}
                {[product.installerMacFile && "Mac", product.installerWinFile && "Windows"].filter(Boolean).join(" et ")} : un clic et
                c&apos;est installé.{" "}
                <Link href="/boutique/aide" className="underline hover:text-foreground">
                  Aide
                </Link>
              </p>
            ) : (
              product.downloadName && (
                <p className="mt-1 text-sm text-muted">
                  Téléchargement : {fileFormat(product.downloadName)}
                  {product.downloadSize ? ` · ${formatBytes(product.downloadSize)}` : ""}
                </p>
              )
            )}
            {product.priceCents === 0 ? (
              <>
                {product.downloadFile ? (
                  <FreeDownloadButton
                    productId={product.id}
                    path={productPath(product)}
                    installers={{ mac: product.installerMacSize, win: product.installerWinSize }}
                  />
                ) : (
                  <p className="mt-4 rounded-lg border border-white/10 px-4 py-3 text-center text-sm text-muted">Bientôt disponible</p>
                )}
                <p className="mt-3 text-xs text-muted">Avec un compte gratuit. Ton fichier reste ensuite disponible dans ton espace.</p>
              </>
            ) : (
              <>
                <AddToCartButton productId={product.id} />
                {product.type === "vst" && !!product.trialDays && product.downloadFile && (
                  <TrialButton productId={product.id} path={productPath(product)} days={product.trialDays} />
                )}
                <p className="mt-3 text-xs text-muted">
                  Téléchargement depuis ton espace après réception du paiement.
                  {product.type === "vst" && !!product.trialDays && " Essai : avec un compte gratuit, une fois par plugin."}
                </p>
                {product.type === "vst" && <AllAccessNote productId={product.id} />}
              </>
            )}
          </div>
        </div>
      </article>
      {product.description && (
        <section className="mt-16 border-t border-white/10 pt-10">
          <h2 className="text-2xl font-bold tracking-tight">Description</h2>
          <CollapsibleDescription text={product.description} />
        </section>
      )}
      {!beat && (
        <Suspense fallback={<div className="mt-16 h-40 animate-pulse rounded-2xl bg-white/5" />}>
          <ProductReviews productId={product.id} productName={product.name} slug={product.slug} path={productPath(product)} />
        </Suspense>
      )}
    </>
  );
}
