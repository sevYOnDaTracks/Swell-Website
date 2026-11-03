import Link from "next/link";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { daws, heroDemo } from "@/lib/content";
import { getPlans } from "@/lib/offers";
import { getPublishedProductions } from "@/lib/productions";
import { mediaUrl } from "@/lib/shop-format";
import { getShopProducts } from "@/lib/shop";
import { CoverColumns, type CoverItem } from "./CoverColumns";
import { HeroAB } from "./HeroAB";
import { SignupButton } from "./SignupButton";

// Hauteurs pseudo-aléatoires mais fixes pour éviter un mismatch serveur/client.
const BARS = Array.from(
  { length: 48 },
  (_, i) =>
    20 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 80),
);

// Logiciels affichés sous l'accroche, dans cet ordre.
const HERO_DAWS = ["FL Studio", "Logic Pro", "Ableton Live", "Studio One"];

// Prix le plus bas des formules visibles, pour l'accroche « à partir de ».
function cheapest<T extends { price: string; visible: boolean }>(plans: T[]) {
  const priced = plans
    .filter((p) => p.visible)
    .map((p) => ({
      ...p,
      value: Number.parseFloat(
        p.price.replace(",", ".").replace(/[^\d.]/g, ""),
      ),
    }))
    .filter((p) => Number.isFinite(p.value));
  return priced.sort((a, b) => a.value - b.value)[0] ?? null;
}

export async function Hero() {
  const [plans, shop, productions] = await Promise.all([
    getPlans(),
    getShopProducts({}),
    getPublishedProductions(),
  ]);
  const fromPlan = cheapest(plans);
  const logos = HERO_DAWS.flatMap((name) =>
    daws.filter((d) => d.name === name),
  );

  // Pochettes qui défilent : les productions d'abord, puis les visuels de la boutique.
  const covers: CoverItem[] = [
    ...productions.map((p) => ({
      key: `prod-${p.id}`,
      title: p.title,
      subtitle: p.artist || p.role,
      cover: p.coverFile ? mediaUrl(p.coverFile) : null,
      href: p.link ?? "/#productions",
      external: !!p.link,
    })),
    ...shop.items
      .filter((p) => p.coverFile)
      .map((p) => ({
        key: `shop-${p.id}`,
        title: p.name,
        subtitle: p.type === "vst" ? "Plugin Swell" : p.type === "instrumental" ? "Instrumentale" : "Boutique Swell",
        cover: mediaUrl(p.coverFile!),
        href: `/boutique/${p.slug}`,
      })),
  ];

  return (
    <>
      {/* Sur grand écran, la hero tient en un seul écran (hauteur de la fenêtre moins le menu). */}
      <section className="relative overflow-hidden lg:flex lg:h-[calc(100svh-4rem)] lg:min-h-[600px] lg:flex-col lg:justify-center">
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-14 lg:py-0">
            <div>
              <p className="text-sm tracking-wide text-muted">#FAITCHEZSWELL</p>

              <h1 className="mt-4 font-condensed text-6xl leading-[0.95] tracking-tight uppercase sm:text-7xl lg:text-[5.5rem]">
                Ton son,
                <br />
                prêt à sortir.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/85">
                Mix, prod et prise de voix à distance par sevyondatracks, et les
                plugins Swell pour ton DAW.
              </p>

              <ul
                className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4 text-foreground sm:gap-x-6"
                aria-label="Logiciels utilisés"
              >
                {logos.map((d) => (
                  <li
                    key={d.name}
                    title={d.name}
                    className="flex h-7 items-center gap-2 opacity-80"
                  >
                    {d.logo && d.image && (
                      // eslint-disable-next-line @next/next/no-img-element -- petite icône statique
                      <img src={d.logo} alt="" className="h-6 w-6" />
                    )}
                    {d.logo && !d.image && (
                      // Logo passé en couleur unie via un masque CSS (s'adapte au thème noir et blanc).
                      <span
                        aria-hidden
                        className="block h-full bg-current"
                        style={{
                          aspectRatio: d.ratio ?? 1,
                          height: d.kind === "wordmark" ? "1rem" : "1.4rem",
                          mask: `url(${d.logo}) center / contain no-repeat`,
                          WebkitMask: `url(${d.logo}) center / contain no-repeat`,
                        }}
                      />
                    )}
                    <span
                      className={
                        d.kind === "wordmark"
                          ? "sr-only"
                          : "text-sm font-semibold tracking-tight"
                      }
                    >
                      {d.name}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href="/reserver"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3.5 font-medium whitespace-nowrap text-black transition-colors hover:bg-neutral-200"
                >
                  <CalendarCheck size={18} />
                  Réserver ta session
                </Link>
                <SignupButton className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/[0.03] px-5 py-3.5 font-medium whitespace-nowrap transition-colors hover:bg-white/10" />
                <Link
                  href="/boutique"
                  className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-3.5 font-medium whitespace-nowrap text-muted transition-colors hover:text-foreground"
                >
                  Boutique
                  <ArrowRight size={18} />
                </Link>
              </div>

              {fromPlan && (
                <p className="mt-5 text-sm text-muted">
                  {fromPlan.name} à partir de{" "}
                  <span className="font-semibold text-foreground">
                    {fromPlan.price}
                  </span>{" "}
                  {fromPlan.unit}
                </p>
              )}
              <p className={`${fromPlan ? "mt-1" : "mt-5"} text-sm text-muted`}>par @sevyondatracks</p>
            </div>

            {/* Pas de pochettes sur téléphone : la hero reste courte et lisible. */}
          <div className="hidden overflow-hidden md:block md:h-[460px] lg:h-full">
              <CoverColumns items={covers} />
            </div>
          </div>
      </section>
      {heroDemo && (
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <HeroAB {...heroDemo} bars={BARS} />
        </div>
      )}
    </>
  );
}
