"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createPromoCode, deletePromoCode, setPromoActive } from "@/app/actions/promos";

export type AdminPromo = {
  id: string;
  code: string;
  label: string;
  active: boolean;
  uses: number;
  maxUses: number | null;
  expiresLabel: string | null;
  expired: boolean;
};

const input =
  "mt-1 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none focus:border-white/50 [color-scheme:dark]";

export function PromoManager({ promos }: { promos: AdminPromo[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-2xl border border-white/5 bg-surface p-5 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_1fr_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          setError(null);
          start(async () => {
            const result = await createPromoCode({
              code: String(data.get("code")),
              kind: String(data.get("kind")),
              value: String(data.get("value")),
              maxUses: String(data.get("maxUses")),
              expiresAt: String(data.get("expiresAt")),
            });
            if ("error" in result) return setError(result.error);
            form.reset();
          });
        }}
      >
        <label className="text-sm">
          Code
          <input name="code" required placeholder="BIENVENUE10" className={`${input} uppercase`} />
        </label>
        <label className="text-sm">
          Type
          <select name="kind" className={input}>
            <option value="percent">Pourcentage (%)</option>
            <option value="amount">Montant (€)</option>
          </select>
        </label>
        <label className="text-sm">
          Remise
          <input name="value" required inputMode="decimal" placeholder="10" className={input} />
        </label>
        <label className="text-sm">
          Utilisations max
          <input name="maxUses" inputMode="numeric" placeholder="Illimité" className={input} />
        </label>
        <label className="text-sm">
          Expire le
          <input name="expiresAt" type="date" className={input} />
        </label>
        <button disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
          Créer
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <ul className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-surface">
        {promos.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">Aucun code promo pour l&apos;instant.</li>}
        {promos.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-mono font-semibold">
                {p.code}
                <span className="font-sans text-sm font-normal">{p.label}</span>
                {p.expired ? (
                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-sans text-xs font-normal text-red-300">Expiré</span>
                ) : (
                  !p.active && <span className="rounded-full border border-white/15 px-2 py-0.5 font-sans text-xs font-normal text-muted">Inactif</span>
                )}
              </p>
              <p className="text-sm text-muted">
                {p.uses}
                {p.maxUses !== null ? ` / ${p.maxUses}` : ""} utilisation{p.uses > 1 ? "s" : ""}
                {p.expiresLabel ? ` · jusqu'au ${p.expiresLabel}` : " · sans date de fin"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => setPromoActive(p.id, !p.active))}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                {p.active ? "Désactiver" : "Activer"}
              </button>
              <button
                type="button"
                disabled={pending}
                aria-label={`Supprimer ${p.code}`}
                onClick={() => {
                  if (confirm(`Supprimer le code ${p.code} ? Les commandes déjà passées ne changent pas.`)) start(() => deletePromoCode(p.id));
                }}
                className="rounded-md p-2 text-muted hover:bg-white/10 hover:text-red-300 disabled:opacity-40"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
