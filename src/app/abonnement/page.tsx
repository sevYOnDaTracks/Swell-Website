import Link from "next/link";
import { Suspense } from "react";
import { Crown } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { ProductCard } from "@/components/shop/ProductCard";
import { SubscribeForm, type Viewer } from "@/components/subscription/SubscribeForm";
import { getPaymentOptions } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";
import { getAllAccessPlugins } from "@/lib/shop";
import { formatPrice } from "@/lib/shop-format";
import { lowestMonthlyCents, SUBSCRIPTION_NAME } from "@/lib/subscription-plans";
import { getPublicSubscriptionSettings, getSubscription } from "@/lib/subscriptions";

export const metadata = {
  title: `${SUBSCRIPTION_NAME} — tous les plugins Swell`,
  description: "Tous les plugins Swell avec un seul abonnement prépayé, sans engagement ni prélèvement automatique.",
};

const longDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export default function SubscriptionPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto mt-16 h-64 max-w-6xl animate-pulse rounded-2xl bg-white/5" />}>
          <SubscriptionContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function SubscriptionContent() {
  const settings = await getPublicSubscriptionSettings();
  const plugins = await getAllAccessPlugins(settings.excludedProductIds);
  const fromCents = lowestMonthlyCents(settings);

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-accent">
            <Crown size={16} /> Abonnement
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">{SUBSCRIPTION_NAME}</h1>
          <p className="mt-3 max-w-xl text-muted">
            Tous les plugins Swell avec un seul abonnement{settings.enabled && fromCents ? `, dès ${formatPrice(fromCents)} par mois` : ""}. Prépayé, sans
            engagement et sans prélèvement automatique.
          </p>
          {settings.enabled && settings.trialDays > 0 && (
            <p className="mt-4 inline-flex rounded-full border border-white/15 px-3 py-1 text-sm">{settings.trialDays} jours d&apos;essai gratuit</p>
          )}
        </div>
      </section>

      <div id="formules" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-white/5" />}>
          <SubscribeSection />
        </Suspense>

        {plugins.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">
              {plugins.length} plugin{plugins.length > 1 ? "s" : ""} compris
            </h2>
            <p className="mt-1 text-sm text-muted">Et chaque nouveau plugin Swell rejoint l&apos;abonnement dès sa sortie.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {plugins.map((p) => (
                <ProductCard key={p.id} product={{ ...p, id: undefined }} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-6 text-sm sm:grid-cols-3">
          {[
            ["Comment ça marche ?", "Tu choisis un pass d'un mois ou d'un an et tu le paies comme une commande (PayPal, Wero, virement, Wave, Orange Money). Dès que le paiement est vérifié, tous les plugins sont dans ton espace avec leur clé."],
            ["Et à la fin du pass ?", "Rien n'est prélevé. Tu reçois un rappel quelques jours avant : prends un nouveau pass et les plugins continuent de marcher, sans rien réinstaller. Sinon, ils s'arrêtent simplement."],
            ["Et si j'achète un plugin ?", "Un plugin acheté à l'unité est à toi pour toujours, abonnement ou pas. Sa clé devient définitive."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/5 bg-surface p-5">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

/**
 * Partie liée au visiteur : son abonnement, l'essai et le paiement. Toujours rendue à la demande
 * (elle lit la session) : ouvrir ou fermer l'abonnement dans l'admin s'y voit tout de suite.
 */
async function SubscribeSection() {
  const user = await getCurrentUser();
  const settings = await getPublicSubscriptionSettings();
  if (!settings.enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
        <p className="font-medium">L&apos;abonnement arrive très bientôt</p>
        <p className="mt-1 text-sm text-muted">En attendant, chaque plugin s&apos;achète à l&apos;unité et beaucoup ont une démo gratuite.</p>
        <Link href="/boutique?type=vst" className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200">
          Voir les plugins
        </Link>
      </div>
    );
  }
  const sub = user ? await getSubscription(user.id) : null;
  const viewer: Viewer = {
    loggedIn: !!user,
    state: sub?.state ?? "none",
    trialUsed: sub?.trialUsed ?? false,
    endsLabel: sub?.endsAt ? longDate.format(sub.endsAt) : null,
  };
  return <SubscribeForm settings={settings} payments={getPaymentOptions()} viewer={viewer} />;
}
