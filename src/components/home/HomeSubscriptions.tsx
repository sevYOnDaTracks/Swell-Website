import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck, FlaskConical } from "lucide-react";
import { FormulaCard, toCardPlugin } from "@/components/subscription/FormulaCard";
import { getSubscribablePlugins } from "@/lib/shop";
import { enabledPlans, formulaIncludes, visibleFormulas } from "@/lib/subscription-plans";
import { getPublicSubscriptionSettings } from "@/lib/subscriptions";

/** Abonnements sur l'accueil : les formules en cartes, comme sur /abonnement. Rien tant que c'est fermé. */
export async function HomeSubscriptions() {
  const settings = await getPublicSubscriptionSettings();
  const formulas = visibleFormulas(settings);
  if (!settings.enabled || formulas.length === 0) return null;
  const plugins = await getSubscribablePlugins();
  const trialFormula = formulas.find((f) => f.id === settings.trialFormulaId);
  const perks = [
    settings.trialDays > 0 && trialFormula ? { Icon: FlaskConical, text: `${settings.trialDays} jours gratuits sur ${trialFormula.name}` } : null,
    { Icon: Bell, text: "Un rappel avant la fin" },
    { Icon: CalendarCheck, text: "Pas de prélèvement automatique" },
  ].filter((p) => p !== null);

  return (
    <section id="abonnements" className="scroll-mt-20 border-y border-white/5 bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="font-condensed text-6xl leading-[0.95] tracking-tight uppercase sm:text-7xl">Tous tes plugins. Un seul pass.</h2>
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {perks.map(({ Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface px-4 py-2 text-sm">
                <Icon size={15} /> {text}
              </li>
            ))}
          </ul>
        </div>

        <div className={`mt-14 grid gap-5 ${formulas.length === 1 ? "mx-auto max-w-md" : formulas.length === 2 ? "mx-auto max-w-4xl md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
          {formulas.map((f) => {
            const plan = f.monthEnabled ? "month" : (enabledPlans(f)[0] ?? "month");
            return (
              <FormulaCard
                key={f.id}
                settings={settings}
                formula={f}
                plan={plan}
                maxPlugins={6}
                plugins={plugins.filter((p) => formulaIncludes(f, p.id)).map(toCardPlugin)}
                cta={
                  <Link
                    href="/abonnement#formules"
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-4 font-semibold transition-colors ${
                      f.highlighted ? "bg-black text-white hover:bg-neutral-800" : "bg-primary text-black hover:bg-neutral-200"
                    }`}
                  >
                    Choisir {f.name} <ArrowRight size={17} />
                  </Link>
                }
              />
            );
          })}
        </div>
        <p className="mt-8 text-center text-sm text-muted">
          Pass d&apos;un mois ou d&apos;un an, payé comme une commande.{" "}
          <Link href="/abonnement" className="text-foreground underline underline-offset-4">
            Comparer les formules
          </Link>
        </p>
      </div>
    </section>
  );
}
