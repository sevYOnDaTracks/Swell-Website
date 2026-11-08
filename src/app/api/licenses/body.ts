import "server-only";
import { normalizeLicenseKey } from "@/lib/licenses";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

// Entrées communes aux routes appelées par les plugins (pas de cookie : la clé fait foi).

const MACHINE_ID = /^[A-Za-z0-9._:-]{8,128}$/;
const PRODUCT = /^[a-z0-9-]{1,80}$/;

export function json(status: number, body: object) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readPluginRequest(request: Request, scope: string) {
  if (isRateLimited(`${scope}:${clientIp(request)}`, 20, 10 * 60_000)) {
    return { error: json(429, { error: "rate_limited", message: "Trop de tentatives. Réessaie dans quelques minutes." }) };
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return { error: json(400, { error: "bad_request", message: "Requête invalide." }) };
  }

  const key = typeof body.key === "string" ? normalizeLicenseKey(body.key) : null;
  const machineId = typeof body.machineId === "string" ? body.machineId : "";
  const product = typeof body.product === "string" ? body.product : "";
  const machineName = typeof body.machineName === "string" ? body.machineName.replace(/[\u0000-\u001f]/g, "").trim() : "";

  if (!key) return { error: json(400, { error: "invalid_key", message: "Cette clé de licence n'a pas le bon format (SWELL-XXXXX-XXXXX-XXXXX-XXXXX)." }) };
  if (!MACHINE_ID.test(machineId)) return { error: json(400, { error: "bad_request", message: "Identifiant d'ordinateur invalide." }) };

  return { key, machineId, machineName, product: PRODUCT.test(product) ? product : "" };
}
