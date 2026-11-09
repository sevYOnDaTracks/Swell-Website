import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { daws, heroDemo } from "@/lib/content";
import { getPlans } from "@/lib/offers";
import { getPublishedProductions } from "@/lib/productions";
import { mediaUrl } from "@/lib/shop-format";
import { CoverColumns, type CoverItem } from "./CoverColumns";
import { HeroAB } from "./HeroAB";

// Hauteurs pseudo-aléatoires mais fixes pour éviter un mismatch serveur/client.
const BARS = Array.from(
  { length: 48 },
  (_, i) =>
    20 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 80),
);

// Logiciels affichés sous l'accroche, dans cet ordre.
const HERO_DAWS = ["FL Studio", "Logic Pro", "Ableton Live", "Studio One"];

// Offre mise en avant : la formule « le plus demandé », sinon la moins chère.
function featuredPlan<T extends { price: string; visible: boolean; highlighted: boolean }>(plans: T[]) {
  const visible = plans.filter((p) => p.visible);
  const highlighted = visible.find((p) => p.highlighted);
  if (highlighted) return highlighted;
  const priced = visible
    .map((p) => ({
      plan: p,
      value: Number.parseFloat(p.price.replace(",", ".").replace(/[^\d.]/g, "")),
    }))
    .filter((p) => Number.isFinite(p.value));
  return priced.sort((a, b) => a.value - b.value)[0]?.plan ?? null;
}

// Délai et révisions repris des points de la formule : ils suivent ce qui est réglé dans /admin/offres.
function planFacts(features: string[]) {
  const delay = features.find((f) => /livraison/i.test(f))?.replace(/livraison/i, "Livré");
  const revisions = features.find((f) => /révision/i.test(f));
  return [delay, revisions && `${revisions} incluses`].filter((f): f is string => !!f);
}

export async function Hero() {
  const [plans, productions] = await Promise.all([getPlans(), getPublishedProductions()]);
  const plan = featuredPlan(plans);
  const facts = plan ? planFacts(plan.features) : [];
  const logos = HERO_DAWS.flatMap((name) =>
    daws.filter((d) => d.name === name),
  );

  // Pochettes qui défilent : les productions (la boutique est sur l'autre site).
  const covers: CoverItem[] = [
    ...productions.map((p) => ({
      key: `prod-${p.id}`,
      title: p.title,
      subtitle: p.artist || p.role,
      cover: p.coverFile ? mediaUrl(p.coverFile) : null,
      href: p.link ?? "/#productions",
      external: !!p.link,
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

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/85">
                Envoie tes pistes, je mixe et je masterise ton titre à distance.
              </p>

              {plan && (
                <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground/90">
                  <li className="text-base">
                    <span className="text-2xl font-bold tracking-tight text-foreground">{plan.price}</span>{" "}
                    <span className="text-muted">{plan.unit}</span>
                  </li>
                  {facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-1.5">
                      <Check size={15} className="shrink-0 text-accent" />
                      {fact}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href={plan?.serviceId ? `/reserver?service=${plan.serviceId}` : "/reserver"}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3.5 font-medium whitespace-nowrap text-black transition-colors hover:bg-neutral-200"
                >
                  <CalendarCheck size={18} />
                  Réserver mon mix
                </Link>
                <Link
                  href="/#tarifs"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/[0.03] px-5 py-3.5 font-medium whitespace-nowrap transition-colors hover:bg-white/10"
                >
                  Voir les tarifs
                </Link>
              </div>

              <p className="mt-4 text-sm text-muted">
                Par @sevyondatracks. Aussi :{" "}
                <Link href="/#services" className="underline-offset-4 hover:text-foreground hover:underline">
                  prod sur mesure et prise de voix guidée
                </Link>

              </p>

              <div className="mt-7 border-t border-white/10 pt-5">
                <ul
                  className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-foreground sm:gap-x-6"
                  aria-label="Logiciels compatibles"
                >
                  {logos.map((d) => (
                    <li
                      key={d.name}
                      title={d.name}
                      className="flex h-7 items-center gap-2"
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
              </div>
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
