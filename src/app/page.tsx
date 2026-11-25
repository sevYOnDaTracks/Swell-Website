import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { MixHome } from "@/components/home/MixHome";
import { ShopHome } from "@/components/home/ShopHome";
import { JsonLd } from "@/components/JsonLd";
import { pageMeta, siteJsonLd } from "@/lib/seo";
import { isMixHost, MIX_URL, SHOP_URL } from "@/lib/sites";

// Une seule page d'accueil pour les deux adresses : boutique sur swell-audio.fr,
// services sur mix.swell-audio.fr (voir src/lib/sites.ts).

export async function generateMetadata(): Promise<Metadata> {
  if (!isMixHost((await headers()).get("host"))) {
    return pageMeta({
      url: `${SHOP_URL}/`,
      title: "Swell — Plugins VST, AU & sons pour beatmakers",
      description: "Plugins Swell (VST3, AU, Standalone), drum kits et sons pour beatmakers, pensés par un ingé son et prêts à glisser dans ton DAW.",
    });
  }
  return pageMeta({
    url: `${MIX_URL}/`,
    title: "Swell Mix — Mix, prod & prise de voix à distance",
    description: "Mix & master, prod sur mesure, reprod et prise de voix guidée à distance par @sevyondatracks.",
  });
}

export default function Home() {
  return (
    <Suspense>
      <HomeForHost />
    </Suspense>
  );
}

async function HomeForHost() {
  const mix = isMixHost((await headers()).get("host"));
  return (
    <>
      <JsonLd data={siteJsonLd(mix)} />
      {mix ? <MixHome /> : <ShopHome />}
    </>
  );
}
