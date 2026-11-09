import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Productions } from "@/components/landing/Productions";
import { Services } from "@/components/landing/Services";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { CallToAction, Footer } from "@/components/landing/Footer";

/** Accueil de mix.swell-audio.fr : les services. */
export function MixHome() {
  return (
    <>
      <Navbar site="mix" />
      <main className="flex-1">
        <Hero />
        <Productions />
        <Services />
        <Pricing />
        <Faq />
        <CallToAction site="mix" />
      </main>
      <Footer site="mix" />
    </>
  );
}
