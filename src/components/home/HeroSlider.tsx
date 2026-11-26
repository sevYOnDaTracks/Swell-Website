"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export type HeroSlide = {
  id: string;
  badge: string;
  title: string;
  text: string;
  ctaLabel: string;
  href: string;
  // "background" : image en grand derrière le texte ; "product" : visuel du produit à droite ;
  // "mosaic" : quatre visuels à droite.
  mode: "background" | "product" | "mosaic";
  images: string[];
};

const DELAY = 7000;

function Cta({ href, children, primary }: { href: string; children: React.ReactNode; primary?: boolean }) {
  const className = primary
    ? "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 font-medium whitespace-nowrap text-black transition-colors hover:bg-neutral-200"
    : "inline-flex items-center justify-center gap-2 rounded-md border border-white/25 bg-black/30 px-6 py-3.5 font-medium whitespace-nowrap backdrop-blur transition-colors hover:bg-white/10";
  return /^https:/.test(href) ? (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** Premier écran de l'accueil : les annonces en grand, qui défilent toutes seules. */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(index + 1), DELAY);
    return () => clearTimeout(t);
  }, [index, paused, count, go]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Annonces"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative isolate overflow-hidden border-b border-white/5"
    >
      <div className="relative grid min-h-[620px] lg:h-[calc(100svh-4rem)] lg:max-h-[860px]">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.id}
              role="group"
              aria-roledescription="annonce"
              aria-label={`${i + 1} sur ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={`col-start-1 row-start-1 transition-[opacity,filter] duration-700 ease-out ${active ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-sm"}`}
            >
              {s.mode === "background" && s.images[0] && (
                <>
                  <Image src={s.images[0]} alt="" fill priority={i === 0} sizes="100vw" unoptimized className="-z-10 object-cover" />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/75 to-black/10" />
                </>
              )}
              <div className="mx-auto grid grid-cols-1 h-full w-full max-w-6xl items-center gap-10 px-4 pt-10 pb-28 sm:px-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-14 lg:py-0">
                <div className="max-w-xl">
                  {s.badge && <p className="inline-flex rounded-full bg-primary px-3 py-1 text-sm font-semibold text-black">{s.badge}</p>}
                  <h2 className="mt-5 font-condensed text-6xl leading-[0.92] tracking-tight text-balance uppercase sm:text-7xl lg:text-[6rem]">{s.title}</h2>
                  {s.text && <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/85">{s.text}</p>}
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Cta href={s.href} primary>
                      {s.ctaLabel} <ArrowRight size={18} />
                    </Cta>
                    {s.href !== "/boutique" && <Cta href="/boutique">Toute la boutique</Cta>}
                  </div>
                </div>
                {s.mode === "product" && s.images[0] && (
                  <div className="relative mx-auto aspect-square w-full max-w-[260px] sm:max-w-[340px] lg:max-w-[460px]">
                    <div className="absolute inset-6 rounded-[2rem] bg-white/10 blur-3xl" aria-hidden />
                    <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
                      <Image src={s.images[0]} alt="" fill priority={i === 0} sizes="460px" unoptimized className="object-cover" />
                    </div>
                  </div>
                )}
                {s.mode === "mosaic" && s.images.length > 0 && (
                  <div className="mx-auto grid w-full max-w-[280px] grid-cols-2 gap-3 sm:max-w-[360px] lg:max-w-[460px]">
                    {s.images.slice(0, 4).map((img, k) => (
                      <div key={img + k} className={`relative aspect-square overflow-hidden rounded-2xl border border-white/10 ${k % 2 === 1 ? "translate-y-8" : ""}`}>
                        <Image src={img} alt="" fill sizes="230px" unoptimized className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 pb-8 sm:px-6">
            <div className="flex flex-1 gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Annonce ${i + 1} : ${s.title}`}
                  aria-current={i === index}
                  className="group relative h-8 flex-1 max-w-28"
                >
                  <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/20">
                    <span
                      key={i === index ? `on-${index}-${paused}` : "off"}
                      className={`block h-full bg-white ${i < index ? "w-full" : i === index ? (paused ? "w-full" : "hero-progress") : "w-0"}`}
                      style={{ animationDuration: `${DELAY}ms` }}
                    />
                  </span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => go(index - 1)} aria-label="Annonce précédente" className="rounded-full border border-white/15 p-2 text-muted transition-colors hover:bg-white/10 hover:text-foreground">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Annonce suivante" className="rounded-full border border-white/15 p-2 text-muted transition-colors hover:bg-white/10 hover:text-foreground">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
