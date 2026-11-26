import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Piano } from "lucide-react";
import { formatPrice, mediaUrl } from "@/lib/shop-format";
import { PLANS, planDays, planPrice, planRegularPrice, planSalePrice, type Formula, type Plan, type SubscriptionSettings } from "@/lib/subscription-plans";

export type CardPlugin = { id: string; name: string; slug: string; coverFile: string | null };

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
  const shown = plugins.slice(0, maxPlugins);
  const rest = plugins.length - shown.length;

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
            {days >= 60 ? `Soit ${formatPrice(Math.round((cents * 30) / days))} par mois · ` : ""}
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

      <ul className="mt-6 space-y-2.5">
        {shown.map((p) => (
          <li key={p.id}>
            <Link href={`/boutique/${p.slug}`} className="group flex items-center gap-3.5">
              <span className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ${inv ? "bg-black/10" : "bg-surface-2"}`}>
                {p.coverFile ? (
                  <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="40px" unoptimized className="object-cover" />
                ) : (
                  <Piano size={16} className="absolute inset-0 m-auto opacity-60" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium underline-offset-4 group-hover:underline">{short(p.name)}</span>
              <Check size={18} className="shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      {(rest > 0 || f.allPlugins) && (
        <p className={`mt-4 text-sm ${muted}`}>
          {rest > 0 ? `+ ${rest} autre${rest > 1 ? "s" : ""} plugin${rest > 1 ? "s" : ""}` : ""}
          {f.allPlugins ? `${rest > 0 ? ", et" : "Et"} chaque nouveau plugin dès sa sortie` : ""}
        </p>
      )}
    </article>
  );
}
