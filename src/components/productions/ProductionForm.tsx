"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImagePlus, Loader2, Music } from "lucide-react";
import { saveProduction } from "@/app/actions/productions";
import { mediaUrl } from "@/lib/shop-format";

export type ProductionFormValues = {
  id: string;
  title: string;
  artist: string;
  role: string;
  link: string | null;
  coverFile: string | null;
  audioFile: string | null;
  published: boolean;
};

const input =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-white/50 focus:ring-2 focus:ring-white/10";

const ROLE_SUGGESTIONS = ["Mix & Master", "Mix", "Mastering", "Prod", "Reprod", "Prise de voix", "Arrangement"];

export function ProductionForm({ production }: { production?: ProductionFormValues }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [coverPreview, setCoverPreview] = useState(production?.coverFile ? mediaUrl(production.coverFile) : null);
  const [audioName, setAudioName] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const result = await saveProduction(formData);
      if ("error" in result) return setError(result.error);
      router.push("/admin/productions");
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {production && <input type="hidden" name="id" value={production.id} />}

      <div className="space-y-5 rounded-2xl border border-white/5 bg-surface p-6">
        <label className="block">
          <span className="text-sm font-medium">Titre du morceau *</span>
          <input name="title" required maxLength={120} defaultValue={production?.title} placeholder="Nom du titre" className={input} />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Artiste</span>
            <input name="artist" maxLength={120} defaultValue={production?.artist} placeholder="Nom de l'artiste" className={input} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Ton rôle</span>
            <input
              name="role"
              list="production-roles"
              maxLength={60}
              defaultValue={production?.role}
              placeholder="Mix & Master"
              className={input}
            />
            <datalist id="production-roles">
              {ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Lien d&apos;écoute</span>
          <input
            name="link"
            type="url"
            defaultValue={production?.link ?? ""}
            placeholder="https://open.spotify.com/track/…"
            className={input}
          />
          <span className="mt-1 block text-xs text-muted">Spotify, YouTube, SoundCloud, Apple Music… (optionnel)</span>
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="published" defaultChecked={production?.published ?? true} className="h-4 w-4 accent-white" />
          Affichée sur l&apos;accueil
        </label>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-white/5 bg-surface p-5">
          <p className="text-sm font-medium">Pochette</p>
          <label className="mt-3 flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-background/40 transition-colors hover:border-white/40">
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) du fichier choisi
              <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-sm text-muted">
                <ImagePlus size={22} /> Choisir une image
              </span>
            )}
            <input
              type="file"
              name="cover"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setCoverPreview(URL.createObjectURL(f));
              }}
            />
          </label>
          <p className="mt-2 text-xs text-muted">Carrée de préférence, JPG / PNG / WebP, 5 Mo max.</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface p-5">
          <p className="text-sm font-medium">Extrait audio</p>
          {production?.audioFile && !audioName && (
            <>
              <audio src={mediaUrl(production.audioFile)} controls className="mt-3 w-full" />
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="removeAudio" className="accent-white" /> Supprimer l&apos;extrait
              </label>
            </>
          )}
          <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm transition-colors hover:bg-white/5">
            <Music size={16} className="text-muted" />
            <span className="truncate">{audioName ?? (production?.audioFile ? "Remplacer l'extrait" : "Ajouter un extrait")}</span>
            <input
              type="file"
              name="audio"
              accept="audio/mpeg,audio/wav,audio/ogg"
              className="sr-only"
              onChange={(e) => setAudioName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          <p className="mt-2 text-xs text-muted">MP3 conseillé (30 à 60 s), 15 Mo max.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            {pending && <Loader2 size={16} className="animate-spin" />}
            {production ? "Enregistrer" : "Ajouter la production"}
          </button>
          <Link href="/admin/productions" className="rounded-lg border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5">
            Annuler
          </Link>
        </div>
      </aside>
    </form>
  );
}
