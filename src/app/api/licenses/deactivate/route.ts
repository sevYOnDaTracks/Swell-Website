import { deactivateLicense } from "@/lib/licenses";
import { json, readPluginRequest } from "../body";

// POST { key, machineId } → { ok }
// Bouton « Désactiver sur cet ordinateur » du plugin : libère la place pour un autre ordinateur.
export async function POST(request: Request) {
  const input = await readPluginRequest(request, "deactivate");
  if ("error" in input) return input.error;
  return json(200, { ok: await deactivateLicense(input) });
}
