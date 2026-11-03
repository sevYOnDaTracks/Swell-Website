import { Suspense } from "react";
import { PackageOpen } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { getShopProducts, parseFilters } from "@/lib/shop";

export const metadata = {
  title: "Boutique — Swell",
  description: "VST, drum kits, sample packs et presets pour beatmakers.",
};

export default function ShopPage({ searchParams }: PageProps<"/boutique">) {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6">
            <p className="text-sm font-medium text-accent">Boutique</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">VST, drum kits & sons</h1>
            <p className="mt-3 max-w-xl text-muted">Des sons testés en vraie session, prêts à glisser dans ton DAW.</p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Suspense fallback={<GridSkeleton />}>
            <ShopResults searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

async function ShopResults({ searchParams }: Pick<PageProps<"/boutique">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const { items, genres, types, hasPlatforms, total } = await getShopProducts(filters);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center">
        <PackageOpen size={32} className="text-muted" />
        <p className="mt-4 font-medium">La boutique ouvre très bientôt</p>
        <p className="mt-1 text-sm text-muted">Les premiers VST et drum kits arrivent.</p>
      </div>
    );
  }

  return (
    <>
      <ShopFilters filters={filters} types={types} genres={genres} showPlatform={hasPlatforms} />
      <p className="mt-6 text-sm text-muted">
        {items.length} produit{items.length > 1 ? "s" : ""}
      </p>
      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center text-sm text-muted">
          Aucun produit ne correspond à ta recherche.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-11 rounded-lg bg-white/5" />
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/5] rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
