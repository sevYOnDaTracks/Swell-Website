import { ShopHero } from "@/components/landing/ShopHero";
import { getPublicHomeSettings } from "@/lib/home";
import { getPublishedProducts } from "@/lib/shop";
import { formatPrice, formatPriceShort, mediaUrl, productPath, saleBadge } from "@/lib/shop-format";
import { lowestMonthlyCents, visibleFormulas } from "@/lib/subscription-plans";
import { getPublicSubscriptionSettings } from "@/lib/subscriptions";
import { HeroSlider, type HeroSlide } from "./HeroSlider";

const saleEnd = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

/**
 * Premier écran de l'accueil. Les annonces viennent d'Admin → Accueil ; sans annonce réglée,
 * il montre tout seul le dernier plugin sorti, l'abonnement et les promos en cours.
 */
export async function HomeHero() {
  const [home, products, sub] = await Promise.all([getPublicHomeSettings(), getPublishedProducts(), getPublicSubscriptionSettings()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const plugins = products.filter((p) => p.type === "vst" && p.coverFile);

  let slides: HeroSlide[] = home.slides.map((s) => {
    const p = s.productId ? byId.get(s.productId) : undefined;
    const productImage = p?.coverFile ? mediaUrl(p.coverFile) : null;
    return {
      id: s.id,
      badge: s.badge,
      title: s.title,
      text: s.text,
      ctaLabel: s.ctaLabel,
      href: s.href,
      mode: s.imageFile ? "background" : productImage ? "product" : "mosaic",
      images: s.imageFile ? [mediaUrl(s.imageFile)] : productImage ? [productImage] : plugins.slice(0, 4).map((x) => mediaUrl(x.coverFile!)),
    };
  });

  if (slides.length === 0) {
    const latest = plugins[0];
    if (latest) {
      slides.push({
        id: `auto-new-${latest.id}`,
        badge: "Nouveau",
        title: latest.name,
        text: latest.shortDescription,
        ctaLabel: "Découvrir",
        href: productPath(latest),
        mode: "product",
        images: [mediaUrl(latest.coverFile!)],
      });
    }
    const formulas = visibleFormulas(sub);
    const prices = formulas.flatMap((f) => lowestMonthlyCents(sub, f) ?? []);
    if (sub.enabled && prices.length > 0) {
      slides.push({
        id: "auto-subscription",
        badge: sub.trialDays > 0 ? `${sub.trialDays} jours gratuits` : "Abonnement",
        title: "Tous tes plugins. Un seul pass.",
        text: `Choisis ta formule dès ${formatPriceShort(Math.min(...prices))} par mois. Prépayé, sans engagement, sans prélèvement automatique.`,
        ctaLabel: "Voir les formules",
        href: "/abonnement",
        mode: "mosaic",
        images: plugins.slice(0, 4).map((p) => mediaUrl(p.coverFile!)),
      });
    }
    for (const p of products.filter((x) => x.compareAtCents && x.coverFile).slice(0, 2)) {
      slides.push({
        id: `auto-sale-${p.id}`,
        badge: saleBadge(p.priceCents, p.compareAtCents!),
        title: p.name,
        text: `${formatPrice(p.priceCents)} au lieu de ${formatPrice(p.compareAtCents!)}${p.saleEndsAt ? `, jusqu'au ${saleEnd.format(p.saleEndsAt)}` : ""}. ${p.shortDescription}`.trim(),
        ctaLabel: "En profiter",
        href: productPath(p),
        mode: "product",
        images: [mediaUrl(p.coverFile!)],
      });
    }
  }

  slides = slides.filter((s) => s.title);
  // Rien à annoncer : l'ancien premier écran de la boutique.
  if (slides.length === 0) return <ShopHero />;
  return <HeroSlider slides={slides} />;
}
