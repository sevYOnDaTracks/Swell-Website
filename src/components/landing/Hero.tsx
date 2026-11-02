import Link from "next/link";
import { ArrowRight, CalendarCheck, ShoppingBag, Sparkles } from "lucide-react";
import { daws, heroDemo } from "@/lib/content";
import { getPlans } from "@/lib/offers";
import { getPublishedProductions } from "@/lib/productions";
import { getShopProducts } from "@/lib/shop";
import { HeroAB } from "./HeroAB";

// Hauteurs pseudo-aléatoires mais fixes pour éviter un mismatch serveur/client.
const BARS = Array.from({ length: 48 }, (_, i) => 20 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 80));

// Prix le plus bas des formules visibles, pour l'accroche « à partir de ».
function cheapest<T extends { price: string; visible: boolean }>(plans: T[]) {
  const priced = plans
    .filter((p) => p.visible)
    .map((p) => ({ ...p, value: Number.parseFloat(p.price.replace(",", ".").replace(/[^\d.]/g, "")) }))
    .filter((p) => Number.isFinite(p.value));
  return priced.sort((a, b) => a.value - b.value)[0] ?? null;
}

export async function Hero() {
  const [plans, plugins, productions] = await Promise.all([
    getPlans(),
    getShopProducts({ type: "vst" }),
    getPublishedProductions(),
  ]);
  const fromPlan = cheapest(plans);
  const pluginCount = plugins.items.length;
  const artists = [...new Set(productions.map((p) => p.artist.trim()).filter(Boolean))].slice(0, 6);

  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-white/[0.06] blur-[120px]" />
      <div className="pointer-events-none absolute top-56 left-1/2 h-[360px] w-[620px] -translate-x-1/2 rounded-full bg-white/[0.04] blur-[140px]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
        {pluginCount > 0 ? (
          <Link
            href="/boutique?type=vst"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-foreground transition-colors hover:border-white/40"
          >
            <Sparkles size={13} />
            <span>
              <span className="font-semibold">Nouveau</span> · {pluginCount} plugin{pluginCount > 1 ? "s" : ""} Swell dans la boutique
            </span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Sessions ouvertes · réservation en ligne
          </span>
        )}

        <p className="mt-8 text-xs font-medium uppercase tracking-[0.25em] text-muted">Studio Swell · par sevyondatracks</p>

        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Ton son, <span className="text-gradient">prêt à sortir.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg">
          Je mixe, je produis et je dirige tes prises de voix à distance. Et je crée les plugins Swell que tu lances dans ton DAW.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/reserver"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-black shadow-lg shadow-white/10 transition-colors hover:bg-neutral-200 sm:w-auto"
          >
            <CalendarCheck size={18} />
            Réserver une session
          </Link>
          <Link
            href="/boutique"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 font-medium transition-colors hover:bg-white/10 sm:w-auto"
          >
            <ShoppingBag size={18} />
            Boutique
            <ArrowRight size={18} />
          </Link>
        </div>

        {fromPlan && (
          <p className="mt-4 text-sm text-muted">
            {fromPlan.name} à partir de <span className="font-semibold text-foreground">{fromPlan.price}</span> {fromPlan.unit}
          </p>
        )}

        {heroDemo ? (
          <HeroAB {...heroDemo} bars={BARS} />
        ) : (
          <div
            aria-hidden
            className="mx-auto mt-16 flex h-28 max-w-3xl items-center justify-center gap-[3px] overflow-hidden rounded-2xl border border-white/5 bg-surface/60 px-4 py-5 sm:gap-1"
          >
            {BARS.map((h, i) => (
              <span
                key={i}
                className="wave-bar w-1 rounded-full bg-gradient-to-t from-neutral-600 to-white sm:w-1.5"
                style={{ height: `${h}%`, animationDelay: `${(i % 12) * 0.1}s` }}
              />
            ))}
          </div>
        )}

        {artists.length > 0 && (
          <div className="mt-12">
            <p className="text-xs uppercase tracking-widest text-muted/70">Ils sont passés au studio</p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-semibold">
              {artists.map((a, i) => (
                <li key={a} className="flex items-center gap-3">
                  {i > 0 && <span className="h-1 w-1 rounded-full bg-white/40" aria-hidden />}
                  {a}
                </li>
              ))}
            </ul>
            <Link href="/#productions" className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
              Écouter les dernières productions <ArrowRight size={12} />
            </Link>
          </div>
        )}

        <div className="mt-12">
          <p className="text-xs uppercase tracking-widest text-muted/70">Je travaille sur</p>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-muted">
            {daws.map((d) => (
              <li key={d.name} title={d.name} className="flex h-7 items-center gap-2.5 opacity-80 transition-opacity hover:opacity-100">
                {d.logo && d.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- petite icône statique
                  <img src={d.logo} alt="" className="h-7 w-7 opacity-90" />
                )}
                {d.logo && !d.image && (
                  // Logo passé en couleur unie via un masque CSS (s'adapte au thème noir et blanc).
                  <span
                    aria-hidden
                    className="block h-full bg-current"
                    style={{
                      aspectRatio: d.ratio ?? 1,
                      height: d.kind === "wordmark" ? "1.35rem" : "1.6rem",
                      mask: `url(${d.logo}) center / contain no-repeat`,
                      WebkitMask: `url(${d.logo}) center / contain no-repeat`,
                    }}
                  />
                )}
                <span className={d.kind === "wordmark" ? "sr-only" : "text-sm font-semibold"}>{d.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
