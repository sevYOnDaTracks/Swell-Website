import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Vérification rapide (présence du cookie) : la vraie vérification de session
// et du rôle se fait côté serveur dans src/lib/session.ts.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    // Qui réserve sans session est le plus souvent un nouveau visiteur : on l'envoie
    // vers l'inscription, qui propose aussi la connexion et garde la destination.
    const entry = request.nextUrl.pathname.startsWith("/reserver") ? "/inscription" : "/connexion";
    const url = new URL(entry, request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/compte/:path*", "/admin/:path*", "/reserver/:path*"],
};
