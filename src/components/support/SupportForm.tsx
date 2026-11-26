"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Paperclip, X } from "lucide-react";
import { submitSupportTicket } from "@/app/actions/support";
import { SUPPORT_SUBJECTS } from "@/lib/support-format";
import type { SupportSubject } from "@/db/schema";

const field =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-white/50 [color-scheme:dark]";

export type SupportViewer = { name: string; email: string } | null;
type Option = { id: string; label: string };

/** Formulaire de demande de support : sujet, plugin ou commande concernés, message, capture. */
export function SupportForm({
  viewer,
  products,
  orders,
  defaultSubject,
}: {
  viewer: SupportViewer;
  products: Option[];
  orders: Option[];
  defaultSubject?: SupportSubject;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [subject, setSubject] = useState<SupportSubject | "">(defaultSubject ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ reference: string; token: string } | null>(null);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const hint = SUPPORT_SUBJECTS.find((s) => s.value === subject)?.hint;
  const askOrder = subject === "paiement" || subject === "abonnement" || subject === "licence";
  const askProduct = subject !== "" && subject !== "paiement" && subject !== "abonnement";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    start(async () => {
      const result = await submitSupportTicket(data);
      if ("error" in result) return setError(result.error);
      setSent({ reference: result.reference, token: result.token });
      form.current?.reset();
      setFileName(null);
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-white/15 bg-surface p-6 sm:p-8">
        <CheckCircle2 size={28} />
        <h2 className="mt-4 text-xl font-semibold">Demande {sent.reference} envoyée</h2>
        <p className="mt-2 text-muted">
          On te répond au plus vite, en général dans la journée. Tu reçois une copie par email{viewer ? "" : ", avec le lien pour suivre l'échange"}.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={viewer ? "/compte/support" : `/support/suivi/${sent.reference}?t=${sent.token}`}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
          >
            Suivre ma demande
          </Link>
          <button type="button" onClick={() => setSent(null)} className="rounded-lg border border-white/15 px-5 py-2.5 text-sm hover:bg-white/5">
            Envoyer une autre demande
          </button>
        </div>
      </div>
    );
  }

  return (
    <form ref={form} onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
      {/* Champ piège pour les robots, invisible pour les humains. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {viewer ? (
        <p className="text-sm text-muted">
          Connecté en tant que <span className="text-foreground">{viewer.name}</span> ({viewer.email}). La réponse arrive dans ton espace et par email.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Ton nom</span>
            <input name="name" required maxLength={80} autoComplete="name" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Ton email</span>
            <input name="email" type="email" required autoComplete="email" placeholder="pour recevoir la réponse" className={field} />
          </label>
        </div>
      )}

      <div>
        <p className="text-sm font-medium">Sujet</p>
        <div role="radiogroup" className="mt-1.5 grid gap-2 sm:grid-cols-3">
          {SUPPORT_SUBJECTS.map((s) => (
            <label
              key={s.value}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                subject === s.value ? "border-white bg-white/10" : "border-white/10 hover:border-white/30"
              }`}
            >
              <input type="radio" name="subject" value={s.value} checked={subject === s.value} onChange={() => setSubject(s.value)} className="h-4 w-4 accent-white" required />
              {s.label}
            </label>
          ))}
        </div>
        {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      </div>

      {(askProduct || (askOrder && viewer)) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {askProduct && (
            <label className="block text-sm">
              <span className="font-medium">Plugin concerné</span>
              <select name="productId" defaultValue="" className={field}>
                <option value="">Aucun en particulier</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {askOrder && viewer && (
            <label className="block text-sm">
              <span className="font-medium">Commande concernée</span>
              <select name="orderId" defaultValue="" className={field}>
                <option value="">Aucune en particulier</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <label className="block text-sm">
        <span className="font-medium">Ton message</span>
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          placeholder="Explique ce qui se passe : ton système (Mac / Windows), ton logiciel de musique, ce que tu as essayé…"
          className={`${field} resize-y`}
        />
      </label>

      <div>
        <input
          ref={fileInput}
          type="file"
          name="attachment"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        {fileName ? (
          <p className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm">
            <Paperclip size={15} /> {fileName}
            <button
              type="button"
              aria-label="Retirer la pièce jointe"
              onClick={() => {
                if (fileInput.current) fileInput.current.value = "";
                setFileName(null);
              }}
              className="rounded p-0.5 text-muted hover:text-foreground"
            >
              <X size={14} />
            </button>
          </p>
        ) : (
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted hover:text-foreground">
            <Paperclip size={15} /> Joindre une capture d&apos;écran (facultatif)
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
      >
        {pending && <Loader2 size={16} className="animate-spin" />} Envoyer ma demande
      </button>
    </form>
  );
}
