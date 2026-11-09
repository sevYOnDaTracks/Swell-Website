// Deux sites, une seule application et une seule base (comptes partagés) :
//  - swell-audio.fr       : la boutique (plugins, sons), démos et licences ;
//  - mix.swell-audio.fr   : les services (mix, prod, reprod, prise de voix), tarifs, réservations,
//                           productions et instrumentales.
// Chaque site a son propre panier (gardé par le navigateur, donc séparé par adresse).
// Le choix se fait sur l'adresse, dans src/proxy.ts. En local : localhost et mix.localhost.

export const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL ?? "https://swell-audio.fr";
export const MIX_URL = process.env.NEXT_PUBLIC_MIX_URL ?? "https://mix.swell-audio.fr";

export type Site = "shop" | "mix";

export const isMixHost = (host: string | null | undefined) => !!host && host.toLowerCase().startsWith("mix.");

// Pages propres à chaque site : ouvertes sur l'autre adresse, elles y renvoient.
export const SHOP_ONLY_PATHS = ["/boutique"];
export const MIX_ONLY_PATHS = ["/reserver", "/instrumentales"];

export const matchesPath = (pathname: string, paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
