import { Navbar } from "@/components/landing/Navbar";
import { ShopHero } from "@/components/landing/ShopHero";
import { Shop } from "@/components/landing/Shop";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";
import { shopFaq } from "@/lib/content";

/** Accueil de swell-audio.fr : la boutique. */
export function ShopHome() {
  return (
    <>
      <Navbar site="shop" />
      <main className="flex-1">
        <ShopHero />
        <Shop />
        <Faq items={shopFaq} />
      </main>
      <Footer site="shop" />
    </>
  );
}
