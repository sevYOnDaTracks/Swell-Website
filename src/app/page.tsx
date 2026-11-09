import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { MixHome } from "@/components/home/MixHome";
import { ShopHome } from "@/components/home/ShopHome";
import { isMixHost } from "@/lib/sites";

// Une seule page d'accueil pour les deux adresses : boutique sur swell-audio.fr,
// services sur mix.swell-audio.fr (voir src/lib/sites.ts).

export async function generateMetadata(): Promise<Metadata> {
  if (!isMixHost((await headers()).get("host"))) return {};
  return {
    title: "Swell Mix — Mix, prod & prise de voix à distance",
    description: "Mix & master, prod sur mesure, reprod et prise de voix guidée à distance par @sevyondatracks.",
  };
}

export default function Home() {
  return (
    <Suspense>
      <HomeForHost />
    </Suspense>
  );
}

async function HomeForHost() {
  return isMixHost((await headers()).get("host")) ? <MixHome /> : <ShopHome />;
}
