import { Navbar } from "@/components/landing/Navbar";
import { Shop } from "@/components/landing/Shop";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";
import { shopFaq } from "@/lib/content";
import { AnnouncementBar } from "./AnnouncementBar";
import { CampaignHero } from "./CampaignHero";
import { HomeHero } from "./HomeHero";
import { HomeSubscriptions } from "./HomeSubscriptions";
import { NewReleases } from "./NewReleases";

/**
 * Accueil de swell-audio.fr : bannière promo, bandeau campagne, annonces en grand (Admin → Accueil),
 * nouveautés, abonnements, puis la boutique et la FAQ.
 */
export function ShopHome() {
  return (
    <>
      <AnnouncementBar />
      <Navbar site="shop" />
      <main className="flex-1">
        <CampaignHero />
        <HomeHero />
        <NewReleases />
        <HomeSubscriptions />
        <Shop />
        <Faq items={shopFaq} />
      </main>
      <Footer site="shop" />
    </>
  );
}
