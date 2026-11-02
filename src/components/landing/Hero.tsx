import Link from "next/link";
import { ArrowRight, CalendarCheck, Sparkles } from "lucide-react";
import { daws, heroDemo } from "@/lib/content";
import { getPlans } from "@/lib/offers";
import { getShopProducts } from "@/lib/shop";
import { HeroAB } from "./HeroAB";
import { StudioSession } from "./StudioSession";

// Hauteurs pseudo-aléatoires mais fixes pour éviter un mismatch serveur/client.
const BARS = Array.from({ length: 48 }, (_, i) => 20 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 80));

// Logiciels affichés sous l'accroche, dans cet ordre.
const HERO_DAWS = ["FL Studio", "Logic Pro", "Ableton Live", "Studio One"];

// Prix le plus bas des formules visibles, pour l'accroche « à partir de ».
function cheapest<T extends { price: string; visible: boolean }>(plans: T[]) {
  const priced = plans
    .filter((p) => p.visible)
    .map((p) => ({ ...p, value: Number.parseFloat(p.price.replace(",", ".").replace(/[^\d.]/g, "")) }))
    .filter((p) => Number.isFinite(p.value));
  return priced.sort((a, b) => a.value - b.value)[0] ?? null;
}

export async function Hero() {
  const [plans, plugins] = await Promise.all([getPlans(), getShopProducts({ type: "vst" })]);
  const fromPlan = cheapest(plans);
  const pluginCount = plugins.items.length;
  const logos = HERO_DAWS.flatMap((name) => daws.filter((d) => d.name === name));

  return (
    // Sur grand écran, la hero tient en un seul écran (hauteur de la fenêtre moins le menu).
    <section className="relative overflow-hidden lg:flex lg:min-h-[calc(100svh-4rem)] lg:flex-col lg:justify-center">
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6 lg:py-10">
        <div className="flex justify-center">
          {pluginCount > 0 ? (
            <Link
              href="/boutique?type=vst"
              className="group inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/[0.04] px-5 py-2 text-sm transition-colors hover:border-white/50"
            >
              <Sparkles size={14} />
              <span className="font-semibold">
                {pluginCount} plugin{pluginCount > 1 ? "s" : ""} Swell disponible{pluginCount > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1 text-muted transition-colors group-hover:text-foreground">
                Découvrir <ArrowRight size={13} />
              </span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.04] px-5 py-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Sessions ouvertes · réservation en ligne
            </span>
          )}
        </div>

        <div className="mt-12 grid items-center gap-12 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
          <div>
            <h1 className="text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Ton son,
              <br />
              prêt à sortir.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted sm:text-xl">
              Swell, c&apos;est le studio de <span className="text-foreground">sevyondatracks</span> : mix, prod et prise de
              voix à distance, plus les <span className="text-foreground">plugins Swell</span> pour ton DAW.
            </p>

            <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4 text-foreground" aria-label="Logiciels utilisés">
              {logos.map((d) => (
                <li key={d.name} title={d.name} className="flex h-7 items-center gap-2 opacity-90">
                  {d.logo && d.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- petite icône statique
                    <img src={d.logo} alt="" className="h-7 w-7" />
                  )}
                  {d.logo && !d.image && (
                    // Logo passé en couleur unie via un masque CSS (s'adapte au thème noir et blanc).
                    <span
                      aria-hidden
                      className="block h-full bg-current"
                      style={{
                        aspectRatio: d.ratio ?? 1,
                        height: d.kind === "wordmark" ? "1.1rem" : "1.6rem",
                        mask: `url(${d.logo}) center / contain no-repeat`,
                        WebkitMask: `url(${d.logo}) center / contain no-repeat`,
                      }}
                    />
                  )}
                  <span className={d.kind === "wordmark" ? "sr-only" : "text-base font-semibold tracking-tight"}>{d.name}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Link
                href="/reserver"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 font-medium whitespace-nowrap text-black shadow-lg shadow-white/10 transition-colors hover:bg-neutral-200"
              >
                <CalendarCheck size={18} />
                Réserver ta session
              </Link>
              <Link
                href="/inscription"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3.5 font-medium whitespace-nowrap transition-colors hover:bg-white/5"
              >
                Inscription
              </Link>
              <Link
                href="/boutique"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3.5 font-medium whitespace-nowrap text-muted transition-colors hover:text-foreground"
              >
                Boutique
                <ArrowRight size={18} />
              </Link>
            </div>

            {fromPlan && (
              <p className="mt-5 text-sm text-muted">
                {fromPlan.name} à partir de <span className="font-semibold text-foreground">{fromPlan.price}</span> {fromPlan.unit}
              </p>
            )}
          </div>

          {/* La fenêtre déborde à droite de l'écran, comme une vraie session ouverte. */}
          <div className="relative h-[220px] sm:h-[325px] md:h-[390px] lg:h-[470px] xl:h-[520px]">
            <div className="absolute top-0 left-0 origin-top-left scale-[0.42] sm:scale-[0.62] md:scale-[0.75] lg:scale-90 xl:scale-100">
              <StudioSession />
            </div>
          </div>
        </div>

        {heroDemo && <HeroAB {...heroDemo} bars={BARS} />}
      </div>
    </section>
  );
}
