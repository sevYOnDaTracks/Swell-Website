"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FlaskConical, Loader2, Send, Users } from "lucide-react";
import { countAudience, sendCampaign, sendTestCampaign } from "@/app/actions/marketing";
import type { AudienceOption } from "@/lib/marketing";

const field =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-white/50 [color-scheme:dark]";

/** Nouvelle campagne : contenu, public (avec le nombre de destinataires), email de test, envoi confirmé. */
export function CampaignComposer({ audiences }: { audiences: AudienceOption[] }) {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("Salut {prenom},\n\n");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [audience, setAudience] = useState(audiences[0]?.value ?? "all");
  // Nombre de destinataires par public, calculé à la première sélection.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const count = counts[audience] ?? null;
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, startTest] = useTransition();
  const [sending, startSend] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const option = audiences.find((a) => a.value === audience);
  const content = { subject, title: title || subject, body, ctaLabel, ctaHref };
  const ready = subject.trim() && body.trim().length >= 5;

  useEffect(() => {
    if (audience in counts) return;
    let alive = true;
    countAudience(audience).then((n) => alive && setCounts((c) => ({ ...c, [audience]: n })));
    return () => {
      alive = false;
    };
  }, [audience, counts]);

  function test() {
    setMessage(null);
    startTest(async () => {
      const result = await sendTestCampaign(content);
      setMessage("error" in result ? { ok: false, text: result.error } : { ok: true, text: `Test envoyé à ${result.email}.` });
    });
  }

  function send() {
    setMessage(null);
    startSend(async () => {
      const result = await sendCampaign({ ...content, audience });
      dialog.current?.close();
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      setMessage({ ok: true, text: `Campagne lancée vers ${result.recipients} personne${result.recipients > 1 ? "s" : ""}. Elle part en arrière-plan : suis l'avancement dans l'historique.` });
      setSubject("");
      setTitle("");
      setBody("Salut {prenom},\n\n");
      setCtaLabel("");
      setCtaHref("");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Objet</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder="Swell EQ est sorti 🎛️" className={field} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Titre dans l&apos;email</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Reprend l'objet si vide" className={field} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Message</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={`${field} resize-y`} />
          <span className="mt-1 block text-xs text-muted">Une ligne vide sépare les paragraphes. {"{prenom}"} est remplacé par le prénom de chaque destinataire.</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <label className="block text-sm">
            <span className="font-medium">Bouton (facultatif)</span>
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={40} placeholder="Découvrir" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Lien du bouton</span>
            <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/boutique/swell-eq" className={field} />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Public</span>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className={field}>
            {audiences.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          {option && <span className="mt-1 block text-xs text-muted">{option.hint}</span>}
        </label>
        <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-background/40 px-4 py-3 text-sm">
          <Users size={16} className="shrink-0 text-muted" />
          {count === null ? (
            <span className="text-muted">Calcul…</span>
          ) : (
            <span>
              <strong className="tabular-nums">{count}</strong> destinataire{count > 1 ? "s" : ""}
            </span>
          )}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Seuls les comptes qui ont accepté les emails, ou qui ont déjà acheté, les reçoivent. Les désinscrits sont exclus, et chaque email a un lien de désinscription.
        </p>

        {message && <p className={`text-sm ${message.ok ? "text-foreground" : "text-red-400"}`}>{message.text}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={test} disabled={!ready || testing} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40">
            {testing ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />} M&apos;envoyer un test
          </button>
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            disabled={!ready || !count}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
          >
            <Send size={15} /> Envoyer{count ? ` à ${count}` : ""}
          </button>
        </div>
      </div>

      <dialog
        ref={dialog}
        onClick={(e) => {
          if (e.target === dialog.current && !sending) dialog.current?.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/15 bg-surface p-6 text-foreground backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <h2 className="text-lg font-semibold">Envoyer la campagne ?</h2>
        <p className="mt-2 text-sm text-foreground/85">
          « {subject} » part à <strong>{count}</strong> personne{(count ?? 0) > 1 ? "s" : ""} ({option?.label}). Un email envoyé ne peut pas être rattrapé : fais
          d&apos;abord un test si ce n&apos;est pas déjà fait.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} disabled={sending} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground">
            Pas encore
          </button>
          <button type="button" onClick={send} disabled={sending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
            {sending && <Loader2 size={15} className="animate-spin" />} Envoyer maintenant
          </button>
        </div>
      </dialog>
    </div>
  );
}
