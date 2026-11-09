import Link from "next/link";
import { Check, Plug } from "lucide-react";
import { mediaUrl } from "@/lib/shop-format";
import { getShopProducts } from "@/lib/shop";
import { CoverColumns, type CoverItem } from "./CoverColumns";

// Accueil de la boutique (swell-audio.fr) : les plugins d'abord.
export async function ShopHero() {
  const shop = await getShopProducts({});
  const plugins = shop.items.filter((p) => p.type === "vst");
  const free = plugins.filter((p) => p.priceCents === 0).length;
  const withTrial = plugins.filter((p) => p.priceCents > 0 && (p.trialDays ?? 0) > 0).length;
  const facts = [
    plugins.length > 0 && `${plugins.length} plugin${plugins.length > 1 ? "s" : ""} Swell`,
    free > 0 && `${free} gratuit${free > 1 ? "s" : ""}`,
    withTrial > 0 && "Démo gratuite sur certains plugins",
    "VST3, AU et Standalone · Windows et Mac",
  ].filter((f): f is string => !!f);

  // Plugins d'abord, puis le reste de la boutique.
  const covers: CoverItem[] = [...plugins, ...shop.items.filter((p) => p.type !== "vst")]
    .filter((p) => p.coverFile)
    .map((p) => ({
      key: p.id,
      title: p.name,
      subtitle: p.type === "vst" ? "Plugin Swell" : "Sons Swell",
      cover: mediaUrl(p.coverFile!),
      href: `/boutique/${p.slug}`,
    }));

  return (
    <section className="relative overflow-hidden lg:flex lg:h-[calc(100svh-4rem)] lg:min-h-[600px] lg:flex-col lg:justify-center">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-14 lg:py-0">
        <div>
          <p className="text-sm tracking-wide text-muted">PLUGINS SWELL</p>
          <h1 className="mt-4 font-condensed text-6xl leading-[0.95] tracking-tight uppercase sm:text-7xl lg:text-[5.5rem]">
            Des plugins
            <br />
            pour ton son.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/85">
            Instruments et effets pensés par un ingé son, testés en vraie session, prêts à glisser dans ton DAW.
          </p>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-foreground/90">
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-1.5">
                <Check size={15} className="shrink-0 text-accent" />
                {fact}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Link
              href="/boutique?type=vst"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3.5 font-medium whitespace-nowrap text-black transition-colors hover:bg-neutral-200"
            >
              <Plug size={18} />
              Voir les plugins
            </Link>
            <Link
              href="/boutique"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/[0.03] px-5 py-3.5 font-medium whitespace-nowrap transition-colors hover:bg-white/10"
            >
              Toute la boutique
            </Link>
          </div>
        </div>
        <div className="hidden overflow-hidden md:block md:h-[460px] lg:h-full">
          <CoverColumns items={covers} />
        </div>
      </div>
    </section>
  );
}
