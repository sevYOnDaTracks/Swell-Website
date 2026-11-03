import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { getFeaturedProducts } from "@/lib/shop";
import { SectionHeading } from "./SectionHeading";

export async function Shop() {
  const products = await getFeaturedProducts(4);
  if (products.length === 0) return null;

  return (
    <section id="boutique" className="scroll-mt-20 border-y border-white/5 bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Boutique"
          title="VST & Drum kits pour beatmakers"
          description="Des sons testés en vraie session, prêts à glisser dans ton DAW."
        />

        <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/boutique"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
          >
            Voir toute la boutique <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
