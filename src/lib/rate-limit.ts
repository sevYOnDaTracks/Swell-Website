import "server-only";

// Limite simple en mémoire, par adresse IP : suffisante pour un seul processus (pm2 swell).
const hits = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request) {
  // Derrière Nginx : la vraie adresse arrive dans X-Real-IP ou X-Forwarded-For.
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "inconnue";
}

/** Vrai si cette clé a dépassé `limit` appels sur la fenêtre `windowMs`. */
export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}
