"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Laptop, X } from "lucide-react";
import { removeMyActivation } from "@/app/actions/licenses";

type Activation = { id: string; machineName: string; lastSeenAt: Date };

const lastSeen = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Clé de licence d'un VST, à copier dans le plugin, et ordinateurs où il est activé. */
export function LicenseKey({
  licenseKey,
  maxActivations,
  activations,
  revoked,
}: {
  licenseKey: string;
  maxActivations: number;
  activations: Activation[];
  revoked: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : la clé reste sélectionnable à la main.
    }
  };

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound size={14} className="shrink-0 text-muted" aria-hidden />
        <code className={`select-all break-all font-mono text-sm ${revoked ? "text-muted line-through" : ""}`}>{licenseKey}</code>
        {!revoked && (
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs transition-colors hover:bg-white/10"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiée" : "Copier"}
          </button>
        )}
      </div>
      {revoked ? (
        <p className="mt-1 text-xs text-red-300">Licence désactivée. Contacte Swell si c&apos;est une erreur.</p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          À coller dans le plugin au premier lancement. Activé sur {activations.length} / {maxActivations} ordinateur
          {maxActivations > 1 ? "s" : ""}.{" "}
          <Link href="/boutique/aide" className="underline hover:text-foreground">
            Comment installer et activer ?
          </Link>
        </p>
      )}
      {activations.length > 0 && (
        <ul className="mt-2 space-y-1">
          {activations.map((a) => (
            <ActivationRow key={a.id} activation={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivationRow({ activation }: { activation: Activation }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5 text-xs">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Laptop size={12} className="shrink-0 text-muted" aria-hidden />
        <span className="truncate">{activation.machineName || "Ordinateur"}</span>
        <span className="shrink-0 text-muted">· vu le {lastSeen.format(activation.lastSeenAt)}</span>
      </span>
      {error && <span className="text-red-300">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await removeMyActivation(activation.id);
            if ("error" in result) setError(result.error);
          })
        }
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40"
        title="Libère la place pour activer le plugin sur un autre ordinateur"
      >
        <X size={12} /> {pending ? "Retrait…" : "Retirer"}
      </button>
    </li>
  );
}
