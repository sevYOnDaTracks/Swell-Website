import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FlaskConical, Piano } from "lucide-react";
import { getSubscribablePlugins } from "@/lib/shop";
import { formatPrice, mediaUrl } from "@/lib/shop-format";
import { formulaIncludes, lowestMonthlyCents, visibleFormulas } from "@/lib/subscription-plans";
import { getPublicSubscriptionSettings } from "@/lib/subscriptions";

/** Section « abonnements » de l'accueil de la boutique : les formules en un coup d'œil. Rien tant que c'est fermé. */
export async function SubscriptionTeaser() {
  const settings = await getPublicSubscriptionSettings();
  const formulas = visibleFormulas(settings);
  if (!settings.enabled || formulas.length === 0) return null;
  const plugins = await getSubscribablePlugins();
  const rows = formulas.map((f) => ({ formula: f, plugins: plugins.filter((p) => formulaIncludes(f, p.id)), from: lowestMonthlyCents(settings, f) }));
  const everything = formulas.some((f) => f.allPlugins);
  const trialFormula = formulas.find((f) => f.id === settings.trialFormulaId);

  return (
    <section id="abonnements" className="scroll-mt-20 border-t border-white/5 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
        <div>
          <h2 className="font-condensed text-6xl leading-[0.95] tracking-tight uppercase sm:text-7xl">
            {everything ? "Tous tes plugins." : "Tes plugins."}
            <br />
            Un seul pass.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/85">
            Prends une formule pour un mois ou un an, paie-la comme une commande et utilise ses plugins tant que ton pass court. Pas de prélèvement
            automatique.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/abonnement"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3.5 font-medium whitespace-nowrap text-black transition-colors hover:bg-neutral-200"
            >
              Voir les formules <ArrowRight size={18} />
            </Link>
            {settings.trialDays > 0 && trialFormula && (
              <span className="inline-flex items-center gap-2 text-sm text-foreground/85">
                <FlaskConical size={16} /> {settings.trialDays} jours gratuits sur {trialFormula.name}
              </span>
            )}
          </div>
        </div>

        <ul className="divide-y divide-white/10 border-y border-white/10">
          {rows.map(({ formula: f, plugins: list, from }) => (
            <li key={f.id}>
              <Link href="/abonnement#formules" className="group flex items-center gap-5 py-6 sm:gap-8">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-3">
                    <span className="font-condensed text-4xl leading-none tracking-tight uppercase sm:text-5xl">{f.name}</span>
                    {f.highlighted && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-black">Le plus choisi</span>}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {list.length} plugin{list.length > 1 ? "s" : ""}
                    {f.description ? ` · ${f.description}` : f.allPlugins ? " · tous les plugins Swell" : ""}
                  </p>
                  <div className="mt-4 flex items-center">
                    {list.slice(0, 7).map((p, i) => (
                      <span key={p.id} className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-2 ring-2 ring-background ${i > 0 ? "-ml-2" : ""}`}>
                        {p.coverFile ? (
                          <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="36px" unoptimized className="object-cover" />
                        ) : (
                          <Piano size={14} className="absolute inset-0 m-auto text-white/60" />
                        )}
                      </span>
                    ))}
                    {list.length > 7 && <span className="ml-2 text-xs text-muted tabular-nums">+{list.length - 7}</span>}
                  </div>
                </div>
                {from !== null && (
                  <p className="shrink-0 text-right">
                    <span className="block text-xs text-muted">dès</span>
                    <span className="text-3xl font-bold tracking-tight tabular-nums">{formatPrice(from)}</span>
                    <span className="block text-xs text-muted">par mois</span>
                  </p>
                )}
                <ArrowRight size={20} className="hidden shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-foreground sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
