"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { sendDirectEmail } from "@/app/actions/marketing";

const field =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-white/50";

/** Email personnel à un compte, déplié sous sa ligne dans Admin → Utilisateurs. */
export function DirectEmailForm({ userId, name, email, onDone }: { userId: string; name: string; email: string; onDone: (message: string) => void }) {
  const firstName = name.trim().split(/\s+/)[0] || "";
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(`Salut ${firstName},\n\n`);
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setError(null);
    start(async () => {
      const result = await sendDirectEmail(userId, { subject, title: subject, body, ctaLabel, ctaHref });
      if ("error" in result) return setError(result.error);
      onDone(`Email envoyé à ${result.email}.`);
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-background/40 p-4">
      <p className="text-sm text-muted">
        À <span className="text-foreground">{name}</span> ({email}) · aux couleurs de Swell, sans lien de désinscription (c&apos;est un message personnel).
      </p>
      <label className="block text-sm">
        <span className="font-medium">Objet</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} className={field} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Message</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} className={`${field} resize-y`} />
        <span className="mt-1 block text-xs text-muted">Une ligne vide sépare les paragraphes.</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <label className="block text-sm">
          <span className="font-medium">Bouton (facultatif)</span>
          <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Voir mes plugins" maxLength={40} className={field} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Lien du bouton</span>
          <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/compte/plugins" className={field} />
        </label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={send}
        disabled={pending || !subject.trim() || body.trim().length < 5}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Envoyer
      </button>
    </div>
  );
}
