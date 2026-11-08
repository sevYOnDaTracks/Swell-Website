"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeActivation, setLicenseMaxActivations, setLicenseRevoked } from "@/app/actions/licenses";

const button = "rounded-lg border border-white/10 px-3 py-1.5 text-xs transition-colors hover:bg-white/10 disabled:opacity-40";

export function AdminLicenseActions({ licenseId, revoked, maxActivations }: { licenseId: string; revoked: boolean; maxActivations: number }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-1.5 text-xs text-muted">
        Ordinateurs
        <select
          defaultValue={maxActivations}
          disabled={pending}
          onChange={(e) => start(() => setLicenseMaxActivations(licenseId, Number(e.target.value)))}
          className="rounded-md border border-white/10 bg-background px-1.5 py-1 text-xs text-foreground"
        >
          {[1, 2, 3, 4, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={pending} onClick={() => start(() => setLicenseRevoked(licenseId, !revoked))} className={button}>
        {revoked ? "Réactiver" : "Désactiver"}
      </button>
    </div>
  );
}

export function AdminRemoveActivation({ activationId }: { activationId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => removeActivation(activationId))}
      className="inline-flex items-center rounded-md p-0.5 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40"
      aria-label="Retirer cet ordinateur"
    >
      <X size={12} />
    </button>
  );
}
