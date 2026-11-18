"use client";

import { useState, useTransition } from "react";
import { replyToReview, setReviewHidden } from "@/app/actions/reviews";

export function AdminReviewActions({ id, reply, hidden }: { id: string; reply: string | null; hidden: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-3 text-sm">
      {reply && !open && (
        <p className="mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-foreground/80">
          <span className="text-xs text-muted">Ta réponse : </span>
          {reply}
        </p>
      )}
      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = String(new FormData(e.currentTarget).get("reply") ?? "");
            start(async () => {
              await replyToReview(id, text);
              setOpen(false);
            });
          }}
          className="space-y-2"
        >
          <textarea
            name="reply"
            rows={3}
            defaultValue={reply ?? ""}
            placeholder="Réponse publique, affichée sous l'avis (vide = retirer la réponse)"
            className="block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 outline-none focus:border-white/50"
          />
          <div className="flex gap-2">
            <button disabled={pending} className="rounded-lg bg-primary px-3 py-1.5 font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              Publier
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-muted hover:text-foreground">
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/10">
            {reply ? "Modifier la réponse" : "Répondre"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              const note = hidden ? "" : prompt("Raison du masquage (insulte, spam, hors sujet, données personnelles…)") ?? "";
              if (!hidden && !note.trim()) return;
              start(async () => {
                const result = await setReviewHidden(id, !hidden, note);
                if ("error" in result) setError(result.error ?? null);
              });
            }}
            className="rounded-lg px-3 py-1.5 text-muted hover:text-foreground disabled:opacity-50"
          >
            {hidden ? "Remettre en ligne" : "Masquer"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-red-300">{error}</p>}
    </div>
  );
}
