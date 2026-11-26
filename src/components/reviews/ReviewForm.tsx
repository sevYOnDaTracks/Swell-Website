"use client";

import { useState, useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import { deleteMyReview, saveReview } from "@/app/actions/reviews";

export type ExistingReview = { rating: number; title: string; body: string; daw: string | null; os: string | null; hidden: boolean };

const input =
  "mt-1 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none focus:border-white/50 [color-scheme:dark]";
const DAWS = ["Ableton Live", "FL Studio", "Logic Pro", "Pro Tools", "Cubase", "Studio One", "Reaper", "Bitwig", "Autre"];
const SYSTEMS = ["macOS", "Windows"];
const ratingWords = ["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent"];

export function ReviewForm({ productId, existing }: { productId: string; existing: ExistingReview | null }) {
  const [editing, setEditing] = useState(!existing);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (!editing && existing) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface p-5 text-sm">
        <p className="font-medium">{done ? "Merci pour ton avis !" : "Tu as déjà donné ton avis sur ce produit."}</p>
        {existing.hidden && <p className="mt-1 text-muted">Il a été masqué par la modération. Tu peux le modifier.</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/10">
            Modifier
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("Supprimer ton avis ?")) return;
              start(() => deleteMyReview(productId));
            }}
            className="rounded-lg px-3 py-1.5 text-muted hover:text-foreground disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form
      className="space-y-4 rounded-2xl border border-white/10 bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const result = await saveReview({
            productId,
            rating,
            title: String(data.get("title") ?? ""),
            body: String(data.get("body") ?? ""),
            daw: String(data.get("daw") ?? ""),
            os: String(data.get("os") ?? ""),
          });
          if ("error" in result) return setError(result.error);
          setDone(true);
          setEditing(false);
        });
      }}
    >
      <h3 className="font-semibold">{existing ? "Modifier mon avis" : "Donner mon avis"}</h3>

      <fieldset>
        <legend className="text-sm">Ta note</legend>
        <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
              aria-pressed={rating === i}
              onMouseEnter={() => setHover(i)}
              onClick={() => setRating(i)}
              className="p-0.5"
            >
              <Star size={26} className={i <= shown ? "fill-amber-400 text-amber-400" : "text-white/25"} />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted">{ratingWords[shown]}</span>
        </div>
      </fieldset>

      <label className="block text-sm">
        Titre <span className="text-muted">(facultatif)</span>
        <input name="title" maxLength={120} defaultValue={existing?.title} placeholder="Ex. : Parfait sur les voix" className={input} />
      </label>
      <label className="block text-sm">
        Ton avis
        <textarea
          name="body"
          required
          minLength={20}
          maxLength={3000}
          rows={5}
          defaultValue={existing?.body}
          placeholder="Le son, la facilité de prise en main, la charge CPU, ce que tu aimerais voir amélioré…"
          className={input}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          DAW <span className="text-muted">(facultatif)</span>
          <select name="daw" defaultValue={existing?.daw ?? ""} className={input}>
            <option value="">—</option>
            {DAWS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Système <span className="text-muted">(facultatif)</span>
          <select name="os" defaultValue={existing?.os ?? ""} className={input}>
            <option value="">—</option>
            {SYSTEMS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          disabled={pending || rating === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          Publier mon avis
        </button>
        {existing && (
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted hover:text-foreground">
            Annuler
          </button>
        )}
      </div>
      <p className="text-xs text-muted">Ton prénom et l&apos;initiale de ton nom seront affichés avec ton avis.</p>
    </form>
  );
}
