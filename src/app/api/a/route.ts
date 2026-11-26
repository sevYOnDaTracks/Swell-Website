import { auth } from "@/lib/auth";
import { recordEvent } from "@/lib/analytics";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

// Point de collecte de la mesure d'audience (envoyé par navigator.sendBeacon). Répond toujours 204.
export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  if (isRateLimited(`a:${clientIp(request)}`, 120, 60_000)) return done;
  let body: { k?: unknown; p?: unknown; l?: unknown; r?: unknown; us?: unknown; uc?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return done;
  }
  const kind = body.k === "cart" ? "cart" : body.k === "view" ? "view" : null;
  if (!kind || typeof body.p !== "string") return done;
  // Les admins ne sont pas comptés.
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if ((session?.user as { role?: string } | undefined)?.role === "admin") return done;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 500) : "");
  await recordEvent(request.headers, { kind, path: body.p, landing: body.l === true, referrer: str(body.r), utmSource: str(body.us), utmCampaign: str(body.uc) }).catch(() => {});
  return done;
}
