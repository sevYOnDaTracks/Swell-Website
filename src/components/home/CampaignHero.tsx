import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { getPublicHomeSettings } from "@/lib/home";
import { getPublishedProducts } from "@/lib/shop";
import { mediaUrl } from "@/lib/shop-format";

/** Met en gras les chiffres et les prix d'une offre (« 3 plugins pour 24 € »). */
function emphasize(text: string): ReactNode[] {
  return text.split(/(\d+(?:[,.]\d+)?\s?€?)/).map((part, i) =>
    /^\d/.test(part) ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Grand bandeau « campagne » tout en haut de l'accueil (réglé dans Admin → Accueil et annonces),
 * dans la charte Swell : noir et blanc, grands titres condensés, prix géant, bouton blanc.
 * Fond : l'image envoyée, sinon une mosaïque discrète des visuels des plugins en noir et blanc.
 */
export async function CampaignHero() {
  const { campaign: c } = await getPublicHomeSettings();
  if (!c.enabled) return null;
  const covers = c.imageFile
    ? []
    : (await getPublishedProducts()).filter((p) => p.type === "vst" && p.coverFile).map((p) => mediaUrl(p.coverFile!));
  const tiles = covers.length ? Array.from({ length: 24 }, (_, i) => covers[i % covers.length]) : [];
  const external = /^https:/.test(c.href);
  const ctaClass =
    "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-7 py-4 text-base font-medium whitespace-nowrap text-black transition-colors hover:bg-neutral-200";

  return (
    <section aria-label={c.title} className="relative isolate overflow-hidden border-b border-white/5">
      <div className="absolute inset-0 -z-10" aria-hidden>
        {c.imageFile ? (
          <>
            <Image src={mediaUrl(c.imageFile)} alt="" fill priority sizes="100vw" unoptimized className="object-cover" />
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : (
          <div className="grid h-full grid-cols-4 gap-3 p-3 opacity-[0.14] grayscale sm:grid-cols-6">
            {tiles.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                <Image src={src} alt="" fill sizes="16vw" unoptimized className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,5,5,0.2)_0%,rgba(5,5,5,0.75)_60%,#050505_100%)]" />
      </div>

      <div className="mx-auto flex min-h-[600px] max-w-5xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:min-h-[calc(100svh-4rem)]">
        {c.subtitle && <p className="rounded-full bg-primary px-3.5 py-1 text-sm font-semibold text-black">{c.subtitle}</p>}
        <h1 className={`font-condensed text-[clamp(4.5rem,12vw,9rem)] leading-[0.88] tracking-tight text-balance uppercase ${c.subtitle ? "mt-6" : ""}`}>
          {c.title}
        </h1>

        {(c.lead || c.price) && (
          <div className="mt-8 border-t border-white/15 pt-8">
            {c.lead && <p className="text-xl text-foreground/85 sm:text-2xl">{c.lead}</p>}
            {c.price && (
              <p className="mt-2 flex items-end justify-center gap-3">
                <span className="font-condensed text-[clamp(5.5rem,17vw,12rem)] leading-[0.8] tracking-tight tabular-nums">{c.price}</span>
                {c.priceNote && <span className="pb-[0.35em] font-condensed text-[clamp(1.5rem,3.5vw,2.5rem)] leading-none text-muted uppercase">{c.priceNote}</span>}
              </p>
            )}
          </div>
        )}

        {c.offers.length > 0 && (
          <ul className="mt-8 flex flex-col items-center gap-2 text-lg text-foreground/80 sm:flex-row sm:gap-0 sm:text-xl">
            {c.offers.map((o, i) => (
              <li key={i} className={i > 0 ? "sm:ml-6 sm:border-l sm:border-white/20 sm:pl-6" : ""}>
                {emphasize(o)}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10">
          {external ? (
            <a href={c.href} target="_blank" rel="noopener" className={ctaClass}>
              {c.ctaLabel} <ArrowRight size={18} />
            </a>
          ) : (
            <Link href={c.href} className={ctaClass}>
              {c.ctaLabel} <ArrowRight size={18} />
            </Link>
          )}
        </div>
        {c.fineprint && <p className="mt-6 max-w-lg text-xs leading-relaxed text-muted">{c.fineprint}</p>}
      </div>
    </section>
  );
}
