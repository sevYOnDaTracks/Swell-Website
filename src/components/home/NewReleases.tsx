import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { getPublicHomeSettings } from "@/lib/home";
import { getPublishedProducts } from "@/lib/shop";

/** Nouveautés de l'accueil : celles choisies dans Admin → Accueil, sinon les derniers plugins sortis. */
export async function NewReleases() {
  const [home, products] = await Promise.all([getPublicHomeSettings(), getPublishedProducts()]);
  const shop = products.filter((p) => p.type !== "instrumental");
  const picked = home.newProductIds.flatMap((id) => shop.filter((p) => p.id === id));
  const items = (picked.length > 0 ? picked : shop.filter((p) => p.type === "vst")).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section id="nouveautes" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-condensed text-5xl leading-none tracking-tight uppercase sm:text-6xl">Nouveautés</h2>
          <Link href="/boutique" className="inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
            Toute la boutique <ArrowRight size={15} />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
