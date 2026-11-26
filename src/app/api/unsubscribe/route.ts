import { checkUnsubscribeToken, setMarketingConsent } from "@/lib/marketing";

// Lien « Ne plus recevoir ces emails » des campagnes.
// GET (clic dans l'email) : page de confirmation. POST (bouton des messageries, RFC 8058) : désinscription directe.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  // Adresse relative : derrière Nginx, request.url pointe vers le serveur interne.
  return new Response(null, { status: 307, headers: { Location: `/desinscription?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}` } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const u = url.searchParams.get("u") ?? "";
  const t = url.searchParams.get("t") ?? "";
  if (!u || !t || !checkUnsubscribeToken(u, t)) return new Response("Lien invalide", { status: 400 });
  await setMarketingConsent(u, false);
  return new Response("Désinscrit", { status: 200 });
}
