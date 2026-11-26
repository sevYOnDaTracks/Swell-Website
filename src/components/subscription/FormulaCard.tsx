import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronDown, Piano } from "lucide-react";
import { formatPrice, formatPriceShort, mediaUrl } from "@/lib/shop-format";
import { monthlyEquivalentCents, PLANS, planDays, planPrice, planRegularPrice, planSalePrice, type Formula, type Plan, type SubscriptionSettings } from "@/lib/subscription-plans";

export type CardPlugin = { id: string; name: string; slug: string; coverFile: string | null; shortDescription: string; priceCents: number };

/** Ce qu'il faut à une carte pour un produit : nom, visuel, phrase courte et prix à l'unité. */
export const toCardPlugin = (p: CardPlugin): CardPlugin => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  coverFile: p.coverFile,
  shortDescription: p.shortDescription,
  priceCents: p.priceCents,
});

const short = (name: string) => name.replace(/^Swell\s+/, "");

/**
 * Carte d'une formule d'abonnement : badge, prix (ancien prix barré en promo), bouton,
 * puis la liste des plugins compris. Partagée par l'accueil et la page /abonnement.
 */
export function FormulaCard({
  settings,
  formula: f,
  plugins,
  plan,
  cta,
  extra,
  mine = false,
  selected = false,
  maxPlugins = 7,
}: {
  settings: SubscriptionSettings;
  formula: Formula;
  plugins: CardPlugin[];
  plan: Plan;
  cta: ReactNode;
  extra?: ReactNode;
  mine?: boolean;
  selected?: boolean;
  maxPlugins?: number;
}) {
  const inv = f.highlighted;
  const cents = planPrice(settings, f, plan);
  const regular = planSalePrice(settings, f, plan) ? planRegularPrice(f, plan) : null;
  const days = planDays(f, plan);
  const muted = inv ? "text-black/60" : "text-muted";
  const line = inv ? "border-black/10" : "border-white/10";
  // Replier la liste ne vaut le coup que pour 3 plugins ou plus : en dessous, tout est affiché.
  const cut = plugins.length > maxPlugins + 2 ? maxPlugins : plugins.length;
  const shown = plugins.slice(0, cut);
  const hidden = plugins.slice(cut);
  const rest = hidden.length;
  // Ce que coûteraient les mêmes plugins achetés un par un (prix normal).
  const value = plugins.reduce((sum, p) => sum + p.priceCents, 0);

  const item = (p: CardPlugin) => (
    <li key={p.id}>
      <Link href={`/boutique/${p.slug}`} className="group flex items-start gap-3.5">
        <span className={`relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-lg ${inv ? "bg-black/10" : "bg-surface-2"}`}>
          {p.coverFile ? (
            <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="44px" unoptimized className="object-cover" />
          ) : (
            <Piano size={16} className="absolute inset-0 m-auto opacity-60" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium underline-offset-4 group-hover:underline">{short(p.name)}</span>
            <Check size={17} className="shrink-0" />
          </span>
          {p.shortDescription && <span className={`mt-0.5 line-clamp-2 text-sm leading-snug ${muted}`}>{p.shortDescription}</span>}
        </span>
      </Link>
    </li>
  );

  return (
    <article
      className={`relative flex flex-col rounded-[1.75rem] border p-7 sm:p-8 ${inv ? "border-white bg-primary text-black" : "border-white/10 bg-surface"} ${
        selected ? (inv ? "ring-4 ring-white/30" : "ring-2 ring-white/60") : ""
      }`}
    >
      <div className="flex min-h-7 items-center gap-2">
        {f.highlighted && <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Le plus acheté</span>}
        {mine && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${inv ? "border border-black/20" : "bg-white text-black"}`}>Ta formule</span>}
      </div>
      <h3 className="mt-4 font-condensed text-5xl leading-none tracking-tight uppercase">{f.name}</h3>

      <div className={`mt-6 border-t pt-6 ${line}`}>
        <p className={`h-7 text-xl tabular-nums ${muted}`}>{regular ? <s>{formatPrice(regular)}</s> : null}</p>
        <p className="flex items-baseline gap-2">
          <span className="text-6xl font-bold tracking-tight tabular-nums">{formatPrice(cents)}</span>
          <span className={`text-lg ${muted}`}>/ {PLANS[plan].short}</span>
        </p>
        <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={muted}>
            {days >= 60 ? `Soit ${formatPriceShort(monthlyEquivalentCents(cents, days))} par mois · ` : ""}
            {days} jours d&apos;accès
          </span>
          {regular && (
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${inv ? "bg-black text-white" : "bg-white text-black"}`}>
              -{Math.round((1 - cents / regular) * 100)} %
            </span>
          )}
        </p>
      </div>

      <div className="mt-7 flex flex-col gap-2">
        {cta}
        {extra}
      </div>

      {f.description && <p className={`mt-6 text-sm leading-relaxed ${muted}`}>{f.description}</p>}

      {plugins.length > 0 && (
        <div className={`mt-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t pt-5 ${line}`}>
          <p className="font-semibold">
            {plugins.length} plugin{plugins.length > 1 ? "s" : ""} compris
          </p>
          {value > cents && <p className={`text-sm ${muted}`}>Valeur à l&apos;unité : {formatPrice(value)}</p>}
        </div>
      )}

      <ul className="mt-4 space-y-3.5">{shown.map(item)}</ul>
      {rest > 0 && (
        <details className="group/more mt-3.5">
          <summary
            className={`flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden ${
              inv ? "border-black/15 hover:bg-black/5" : "border-white/10 hover:bg-white/5"
            }`}
          >
            <span className="group-open/more:hidden">
              Voir les {rest} autres plugins
            </span>
            <span className="hidden group-open/more:inline">Réduire la liste</span>
            <ChevronDown size={16} className="transition-transform group-open/more:rotate-180" />
          </summary>
          <ul className="mt-3.5 space-y-3.5">{hidden.map(item)}</ul>
        </details>
      )}
      {f.allPlugins && <p className={`mt-4 text-sm ${muted}`}>Et chaque nouveau plugin dès sa sortie.</p>}
    </article>
  );
}
