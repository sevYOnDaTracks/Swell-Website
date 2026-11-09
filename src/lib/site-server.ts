import "server-only";
import { headers } from "next/headers";
import { isMixHost, type Site } from "./sites";

/** Site de la requête en cours : mix.swell-audio.fr (services) ou swell-audio.fr (boutique). */
export async function currentSite(): Promise<Site> {
  return isMixHost((await headers()).get("host")) ? "mix" : "shop";
}
