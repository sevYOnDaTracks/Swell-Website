import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Productions } from "@/components/landing/Productions";
import { Services } from "@/components/landing/Services";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { CallToAction, Footer } from "@/components/landing/Footer";

// Accueil de mix.swell-audio.fr (servi sur « / » de cette adresse par src/proxy.ts).
export const metadata = {
  title: "Swell Mix — Mix, prod & prise de voix à distance",
  description: "Mix & master, prod sur mesure, reprod et prise de voix guidée à distance par @sevyondatracks.",
};

export default function MixHome() {
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
