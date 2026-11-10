"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Commande ou chemin à copier en un clic (page d'aide). */
export function CopyCommand({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé : le texte reste sélectionnable à la main.
    }
  };

  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-black/40 p-3">
      <code className="min-w-0 flex-1 select-all break-all font-mono text-[13px] leading-relaxed text-foreground">{children}</code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-muted transition-colors hover:bg-white/10 hover:text-foreground"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
