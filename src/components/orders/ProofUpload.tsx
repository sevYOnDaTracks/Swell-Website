"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

/** Envoi de la capture du paiement mobile money : l'admin la vérifie puis valide la commande. */
export function ProofUpload({ orderId, sentAt }: { orderId: string; sentAt: Date | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(sentAt ? "sent" : "idle");
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setStatus("sending");
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/proof`, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    if (res.ok) {
      setStatus("sent");
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error ?? "L'envoi a échoué, réessaie.");
    setStatus("error");
  }

  return (
    <div className="mt-3">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void send(file);
          e.target.value = "";
        }}
      />
      {status === "sent" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="flex-1">Justificatif envoyé : je vérifie le paiement et je valide ta commande.</span>
          <button type="button" onClick={() => input.current?.click()} className="text-xs text-muted underline underline-offset-2 hover:text-foreground">
            Changer
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={status === "sending"}
          onClick={() => input.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {status === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          J&apos;ai payé : envoyer la capture
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
