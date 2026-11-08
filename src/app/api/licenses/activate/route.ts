import { activateLicense } from "@/lib/licenses";
import { json, readPluginRequest } from "../body";

// POST { key, product, machineId, machineName } → { license, activations, maxActivations }
// Appelée par les plugins au moment de l'activation. Idempotente pour un même ordinateur.
export async function POST(request: Request) {
  const input = await readPluginRequest(request, "activate");
  if ("error" in input) return input.error;
  if (!input.product) return json(400, { error: "bad_request", message: "Plugin inconnu." });

  const result = await activateLicense(input);
  if (!result.ok) return json(result.status, { error: result.error, message: result.message });
  return json(200, { license: result.license, activations: result.activations, maxActivations: result.maxActivations });
}
