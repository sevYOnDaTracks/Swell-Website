"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { updateSupportSettings, updateSupportStatus } from "@/app/actions/support";

/** Résoudre ou rouvrir une demande. */
export function TicketStatusButton({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => updateSupportStatus(ticketId, closed ? "open" : "closed"))}
      className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : closed ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
      {closed ? "Rouvrir" : "Marquer résolue"}
    </button>
  );
}

/** Numéro WhatsApp affiché sur la page /support (vide = pas de bouton). */
export function WhatsappSetting({ value }: { value: string }) {
  const [number, setNumber] = useState(value);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        start(async () => {
          const result = await updateSupportSettings(number);
          setMessage("error" in result ? { ok: false, text: result.error } : { ok: true, text: number.trim() ? "Bouton WhatsApp affiché sur /support." : "Bouton WhatsApp retiré." });
        });
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="block text-sm">
        <span className="text-xs text-muted">WhatsApp affiché sur /support</span>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+2250700000000"
          inputMode="tel"
          className="mt-1 block w-52 rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none focus:border-white/50"
        />
      </label>
      <button disabled={pending || number === value} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-40">
        {pending ? <Loader2 size={15} className="animate-spin" /> : "Enregistrer"}
      </button>
      {message && <p className={`w-full text-xs ${message.ok ? "text-muted" : "text-red-400"}`}>{message.text}</p>}
    </form>
  );
}
