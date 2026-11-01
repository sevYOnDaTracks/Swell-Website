import { ArrowRight, Drum, Piano } from "lucide-react";
import { products } from "@/lib/content";
import { SectionHeading } from "./SectionHeading";

export function Shop() {
  return (
    <section id="boutique" className="scroll-mt-20 border-y border-white/5 bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Boutique"
          title="VST & Drum kits pour beatmakers"
          description="Des sons testés en vraie session, prêts à glisser dans ton DAW."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {products.map((p) => {
            const Icon = p.type === "VST" ? Piano : Drum;
            return (
              <article key={p.name} className="overflow-hidden rounded-2xl border border-white/5 bg-surface">
                <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-white/10 via-surface-2 to-white/[0.02]">
                  <Icon size={44} className="text-white/80" />
                  <span className="absolute left-4 top-4 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white/80">
                    {p.type}
                  </span>
                </div>
                <div className="flex items-end justify-between p-5">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="mt-1 text-sm text-muted">{p.detail}</p>
                  </div>
                  <span className="font-semibold text-accent">{p.price}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <a href="#" className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline hover:text-white">
            Voir toute la boutique <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
