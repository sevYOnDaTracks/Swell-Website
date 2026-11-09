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
  } else {
    if (pathname === "/mix") return NextResponse.redirect(`${MIX_URL}/${search}`); // ancienne adresse
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
  return migrateSessionCookie(request, NextResponse.next());
}

// Connexions ouvertes avant le passage à deux adresses : leur cookie ne vaut que pour swell-audio.fr,
// donc mix.swell-audio.fr les voit déconnectées. À la première visite sur swell-audio.fr, le cookie est
// reposé pour tout le domaine (et l'ancien effacé, sinon la déconnexion ne le retirerait pas).
const SESSION_COOKIE = "__Secure-better-auth.session_token";
const MIGRATED = "swell_sso";

function migrateSessionCookie(request: NextRequest, response: NextResponse) {
  const host = request.headers.get("host") ?? "";
  if (host !== "swell-audio.fr" || request.cookies.has(MIGRATED)) return response;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return response;
  const shared = "Domain=swell-audio.fr; Path=/; Secure; SameSite=Lax";
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  response.headers.append("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=604800; HttpOnly; ${shared}`);
  response.headers.append("Set-Cookie", `${MIGRATED}=1; Max-Age=31536000; ${shared}`);
  return response;
}

export const config = {
  // Toutes les pages, sauf l'API, les fichiers de Next, les médias et les fichiers statiques.
  matcher: ["/((?!api|_next|media|.*\\..*).*)"],
};
