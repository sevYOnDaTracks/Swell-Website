import { Suspense } from "react";
import { FlaskConical } from "lucide-react";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { AnnouncementBar } from "@/components/home/AnnouncementBar";
import { toCardPlugin } from "@/components/subscription/FormulaCard";
import { PricingTable, type PricingFormula, type Viewer } from "@/components/subscription/PricingTable";
import { subscriptionFaq } from "@/lib/content";
import { getPaymentOptions } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";
import { getSubscribablePlugins } from "@/lib/shop";
import { formatPrice, formatPriceShort } from "@/lib/shop-format";
import { formulaIncludes, lowestMonthlyCents, SUBSCRIPTION_NAME, visibleFormulas } from "@/lib/subscription-plans";
import { getPublicSubscriptionSettings, getSubscription } from "@/lib/subscriptions";

export const metadata = {
  title: `${SUBSCRIPTION_NAME} — les plugins Swell en formule prépayée`,
  description: "Les plugins Swell en abonnement prépayé : choisis ta formule, sans engagement ni prélèvement automatique.",
};

const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export default function SubscriptionPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto mt-16 h-64 max-w-6xl animate-pulse rounded-3xl bg-white/5" />}>
          <SubscriptionContent />
        </Suspense>
        <Faq items={subscriptionFaq} />
      </main>
      <Footer />
    </>
  );
}

const STEPS = [
  ["Choisis ta formule", "Un pass d'un mois ou d'un an, selon les plugins qu'il te faut."],
  ["Paie avec ta référence", "PayPal, Wero, virement, Wave ou Orange Money, comme une commande."],
  ["Tes plugins s'activent", "Dès que le paiement est vérifié : téléchargements et clés dans ton espace."],
];

async function SubscriptionContent() {
  const settings = await getPublicSubscriptionSettings();
  const formulas = visibleFormulas(settings);
  const prices = formulas.flatMap((f) => lowestMonthlyCents(settings, f) ?? []);
  const fromCents = prices.length ? Math.min(...prices) : null;
  const everything = formulas.some((f) => f.allPlugins);
  const trialFormula = formulas.find((f) => f.id === settings.trialFormulaId);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20">
        <h1 className="font-condensed text-6xl leading-[0.95] tracking-tight text-balance uppercase sm:text-7xl lg:text-[5.5rem]">
          {everything ? (
            <>
              Tous tes plugins.
              <br />
              Un seul pass.
            </>
          ) : (
            <>
              Tes plugins.
              <br />
              En un pass.
            </>
          )}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-foreground/85">
          Prépayé, sans engagement et sans prélèvement automatique
          {settings.enabled && fromCents ? `, dès ${formatPriceShort(fromCents)} par mois` : ""}. Tu prolonges quand tu veux.
        </p>
        {settings.enabled && settings.trialDays > 0 && trialFormula && (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm">
            <FlaskConical size={15} /> {settings.trialDays} jours d&apos;essai gratuit sur {trialFormula.name}
          </p>
        )}
      </section>

      <section id="formules" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6">
        <Suspense fallback={<div className="h-[520px] animate-pulse rounded-3xl bg-white/5" />}>
          <Pricing />
        </Suspense>
      </section>

      <section className="border-y border-white/5 bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-condensed text-5xl leading-none tracking-tight uppercase">Comment ça marche</h2>
          <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="border-t border-white/15 pt-5">
                <p className="font-condensed text-3xl leading-none text-muted tabular-nums">{i + 1}</p>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

/**
 * Formules et paiement, liés au visiteur (son abonnement, l'essai). Toujours rendus à la demande
 * (ils lisent la session) : ouvrir ou fermer l'abonnement dans l'admin s'y voit tout de suite.
 */
async function Pricing() {
  const user = await getCurrentUser();
  const settings = await getPublicSubscriptionSettings();
  const sub = user ? await getSubscription(user.id) : null;
  const viewer: Viewer = {
    loggedIn: !!user,
    trialUsed: sub?.trialUsed ?? false,
    access: (sub?.formulas ?? []).map((f) => ({ formulaId: f.formulaId, name: f.name, state: f.state, endsLabel: longDate.format(f.endsAt) })),
  };
  const plugins = await getSubscribablePlugins();
  const formulas: PricingFormula[] = visibleFormulas(settings).map((f) => ({
    formula: f,
    plugins: plugins.filter((p) => formulaIncludes(f, p.id)).map(toCardPlugin),
  }));
  return <PricingTable settings={settings} formulas={formulas} payments={getPaymentOptions()} viewer={viewer} />;
}
