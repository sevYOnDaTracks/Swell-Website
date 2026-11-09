import { Navbar } from "@/components/landing/Navbar";
import { MixBanner, ShopHero } from "@/components/landing/ShopHero";
import { Shop } from "@/components/landing/Shop";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";
import { shopFaq } from "@/lib/content";

// swell-audio.fr : la boutique. Les services sont sur mix.swell-audio.fr (src/app/mix).
export default function Home() {
  return (
    <>
      <Navbar site="shop" />
      <main className="flex-1">
        <ShopHero />
        <Shop />
        <Faq items={shopFaq} />
        <MixBanner />
      </main>
      <Footer site="shop" />
    </>
  );
}
