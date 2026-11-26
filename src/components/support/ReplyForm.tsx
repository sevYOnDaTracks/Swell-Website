"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { replyAsAdmin, replyToSupportTicket } from "@/app/actions/support";
import { CANNED_REPLIES } from "@/lib/support-format";

const field =
  "block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-white/50 [color-scheme:dark]";

/** Réponse à une demande : côté client (référence + jeton) ou côté admin (réponses types, « répondre et résoudre »). */
export function ReplyForm(props: { mode: "client"; reference: string; token?: string; closed: boolean } | { mode: "admin"; ticketId: string; firstName: string }) {
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(close: boolean) {
    if (!form.current) return;
    setError(null);
    const data = new FormData(form.current);
    if (close) data.set("close", "1");
    start(async () => {
      const result = props.mode === "admin" ? await replyAsAdmin(data) : await replyToSupportTicket(data);
      if ("error" in result) return setError(result.error);
      setBody("");
      setFileName(null);
      form.current?.reset();
    });
  }

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        send(false);
      }}
      className="space-y-3 rounded-2xl border border-white/10 bg-surface p-4"
    >
      {props.mode === "admin" ? <input type="hidden" name="ticketId" value={props.ticketId} /> : <input type="hidden" name="reference" value={props.reference} />}
      {props.mode === "client" && props.token && <input type="hidden" name="token" value={props.token} />}
      {props.mode === "admin" && (
        <label className="block text-xs text-muted">
          <span className="sr-only">Réponse type</span>
          <select
            value=""
            onChange={(e) => {
              const reply = CANNED_REPLIES.find((r) => r.label === e.target.value);
              if (reply) setBody(reply.text.replace("Bonjour,", `Bonjour ${props.firstName},`));
            }}
            className={`${field} py-2 text-xs`}
          >
            <option value="">Insérer une réponse type…</option>
            {CANNED_REPLIES.map((r) => (
              <option key={r.label} value={r.label}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="sr-only">Message</span>
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={props.mode === "admin" ? 7 : 4}
          maxLength={5000}
          placeholder={props.mode === "admin" ? "Ta réponse au client…" : props.closed ? "Toujours un souci ? Écris ici : la demande sera rouverte." : "Ajoute une précision ou réponds…"}
          className={`${field} resize-y`}
        />
      </label>
      <input ref={fileInput} type="file" name="attachment" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
      {error && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {fileName ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <Paperclip size={14} /> {fileName}
            <button
              type="button"
              aria-label="Retirer la pièce jointe"
              onClick={() => {
                if (fileInput.current) fileInput.current.value = "";
                setFileName(null);
              }}
              className="rounded p-0.5 hover:text-foreground"
            >
              <X size={14} />
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
            <Paperclip size={14} /> Joindre un fichier
          </button>
        )}
        <div className="flex gap-2">
          {props.mode === "admin" && (
            <button type="button" onClick={() => send(true)} disabled={pending || !body.trim()} className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40">
              Répondre et résoudre
            </button>
          )}
          <button type="submit" disabled={pending || !body.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40">
            {pending && <Loader2 size={15} className="animate-spin" />} {props.mode === "admin" ? "Envoyer" : "Envoyer"}
          </button>
        </div>
      </div>
    </form>
  );
}
