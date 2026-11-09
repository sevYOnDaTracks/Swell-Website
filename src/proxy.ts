import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { isMixHost, matchesPath, MIX_ONLY_PATHS, MIX_URL, SHOP_ONLY_PATHS, SHOP_URL } from "@/lib/sites";

const PROTECTED = ["/compte", "/admin", "/reserver"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const mix = isMixHost(request.headers.get("host"));

  // 1. Le bon site selon l'adresse. Les redirections utilisent les adresses publiques :
  //    derrière Nginx, request.url pointe vers le serveur interne.
  if (mix) {
    if (matchesPath(pathname, SHOP_ONLY_PATHS)) return NextResponse.redirect(`${SHOP_URL}${pathname}${search}`);
    if (pathname === "/") {
      // nextUrl garde l'adresse interne : avec request.url, le https venu de Nginx fait passer la réécriture pour externe.
      const url = request.nextUrl.clone();
      url.pathname = "/mix";
      return NextResponse.rewrite(url);
    }
  } else {
    if (pathname === "/mix") return NextResponse.redirect(`${MIX_URL}/${search}`);
    if (matchesPath(pathname, MIX_ONLY_PATHS)) return NextResponse.redirect(`${MIX_URL}${pathname}${search}`);
  }

  // 2. Vérification rapide (présence du cookie) : la vraie vérification de session
  //    et du rôle se fait côté serveur dans src/lib/session.ts.
  if (matchesPath(pathname, PROTECTED) && !getSessionCookie(request)) {
    // Qui réserve sans session est le plus souvent un nouveau visiteur : on l'envoie
    // vers l'inscription, qui propose aussi la connexion et garde la destination.
    const entry = pathname.startsWith("/reserver") ? "/inscription" : "/connexion";
    const url = new URL(entry, mix ? MIX_URL : SHOP_URL);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Toutes les pages, sauf l'API, les fichiers de Next, les médias et les fichiers statiques.
  matcher: ["/((?!api|_next|media|.*\\..*).*)"],
};
