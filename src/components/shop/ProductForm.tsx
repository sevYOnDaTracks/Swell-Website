"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImagePlus, Loader2, Music } from "lucide-react";
import { saveProduct } from "@/app/actions/products";
import type { ProductType } from "@/db/schema";
import { hasCompatibility, isInstrumental, mediaUrl, PLATFORMS, PLUGIN_FORMATS, productTypeLabels } from "@/lib/shop-format";
import { DeliverableUpload } from "./DeliverableUpload";

export type ProductFormValues = {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  priceCents: number;
  shortDescription: string;
  description: string;
  genres: string[];
  platforms: string[];
  formats: string[];
  bpm: number | null;
  musicalKey: string | null;
  coverFile: string | null;
  previewFile: string | null;
  downloadFile: string | null;
  downloadName: string | null;
  downloadSize: number | null;
  published: boolean;
  featured: boolean;
};

const input =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-white/50 focus:ring-2 focus:ring-white/10";

export function ProductForm({ product }: { product?: ProductFormValues }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [coverPreview, setCoverPreview] = useState(product?.coverFile ? mediaUrl(product.coverFile) : null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [type, setType] = useState<ProductType>(product?.type ?? "drumkit");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const result = await saveProduct(formData);
      if ("error" in result) return setError(result.error);
      // Nouveau produit : on ouvre sa fiche pour pouvoir y joindre le fichier à livrer.
      router.push(product ? "/admin/produits" : `/admin/produits/${result.id}?nouveau=1`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="space-y-5 rounded-2xl border border-white/5 bg-surface p-6">
        <label className="block">
          <span className="text-sm font-medium">Nom du produit *</span>
          <input name="name" required defaultValue={product?.name} placeholder="Swell Drums Vol. 2" className={input} />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Type *</span>
            <select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as ProductType)}
              className={`${input} [color-scheme:dark]`}
            >
              {(Object.keys(productTypeLabels) as ProductType[]).map((t) => (
                <option key={t} value={t}>
                  {productTypeLabels[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Prix (€) *</span>
            <input
              name="price"
              required
              inputMode="decimal"
              defaultValue={product ? (product.priceCents / 100).toString().replace(".", ",") : ""}
              placeholder="29,99 (0 = gratuit)"
              className={input}
            />
          </label>
        </div>

        {hasCompatibility(type) && (
          <div className="grid gap-5 rounded-xl border border-white/10 bg-background/40 p-4 sm:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-medium">Plateformes</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <CheckPill key={p.value} name="platforms" value={p.value} defaultChecked={product?.platforms.includes(p.value)}>
                    {p.label}
                  </CheckPill>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">Formats</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLUGIN_FORMATS.map((f) => (
                  <CheckPill key={f.value} name="formats" value={f.value} defaultChecked={product?.formats.includes(f.value)} title={"hint" in f ? f.hint : undefined}>
                    {f.label}
                  </CheckPill>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {isInstrumental(type) && (
          <div className="grid gap-5 rounded-xl border border-white/10 bg-background/40 p-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">BPM</span>
              <input name="bpm" inputMode="numeric" defaultValue={product?.bpm ?? ""} placeholder="140" className={input} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Tonalité</span>
              <input name="musicalKey" maxLength={12} defaultValue={product?.musicalKey ?? ""} placeholder="Am, F# min…" className={input} />
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">Accroche</span>
          <input
            name="shortDescription"
            maxLength={160}
            defaultValue={product?.shortDescription}
            placeholder="120+ one-shots & loops trap, prêts à l'emploi"
            className={input}
          />
          <span className="mt-1 block text-xs text-muted">Affichée sur les cartes de la boutique (160 caractères max).</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <textarea
            name="description"
            rows={7}
            defaultValue={product?.description}
            placeholder="Contenu du pack, formats, compatibilité DAW, licence…"
            className={`${input} resize-y`}
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Genres / tags</span>
            <input name="genres" defaultValue={product?.genres.join(", ")} placeholder="trap, drill, afro" className={input} />
            <span className="mt-1 block text-xs text-muted">Séparés par des virgules : servent aux filtres.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Adresse (slug)</span>
            <input name="slug" defaultValue={product?.slug} placeholder="générée depuis le nom" className={input} />
            <span className="mt-1 block text-xs text-muted">/boutique/…</span>
          </label>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-white/5 bg-surface p-5">
          <p className="text-sm font-medium">Visuel</p>
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
          <p className="mt-2 text-xs text-muted">JPG, PNG ou WebP, 5 Mo max. Format carré conseillé.</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-surface p-5">
          <p className="text-sm font-medium">Extrait audio</p>
          {product?.previewFile && !audioName && (
            <>
              <audio src={mediaUrl(product.previewFile)} controls className="mt-3 w-full" />
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="removePreview" className="accent-white" /> Supprimer l&apos;extrait
              </label>
            </>
          )}
          <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm transition-colors hover:bg-white/5">
            <Music size={16} className="text-muted" />
            <span className="truncate">{audioName ?? (product?.previewFile ? "Remplacer l'extrait" : "Ajouter un extrait")}</span>
            <input
              type="file"
              name="preview"
              accept="audio/mpeg,audio/wav,audio/ogg"
              className="sr-only"
              onChange={(e) => setAudioName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          <p className="mt-2 text-xs text-muted">MP3, WAV ou OGG, 15 Mo max.</p>
        </div>

        {product ? (
          <DeliverableUpload
            productId={product.id}
            current={product.downloadFile ? { name: product.downloadName ?? "fichier", size: product.downloadSize ?? 0 } : null}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-muted">
            <p className="font-medium text-foreground">Fichier à livrer</p>
            <p className="mt-1">Crée d&apos;abord le produit : tu pourras ensuite y joindre le ZIP ou l&apos;installateur.</p>
          </div>
        )}

        <div className="space-y-3 rounded-2xl border border-white/5 bg-surface p-5 text-sm">
          <label className="flex items-center gap-3">
            <input type="checkbox" name="published" defaultChecked={product?.published ?? false} className="h-4 w-4 accent-white" />
            Publié dans la boutique
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="h-4 w-4 accent-white" />
            Mis en avant sur l&apos;accueil
          </label>
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
            {product ? "Enregistrer" : "Créer le produit"}
          </button>
          <Link href="/admin/produits" className="rounded-lg border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5">
            Annuler
          </Link>
        </div>
      </aside>
    </form>
  );
}

function CheckPill({
  name,
  value,
  defaultChecked,
  title,
  children,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <label title={title} className="cursor-pointer">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-block rounded-full border border-white/15 px-3 py-1.5 text-sm text-muted transition-colors hover:border-white/40 peer-checked:border-white peer-checked:bg-white peer-checked:text-black peer-focus-visible:ring-2 peer-focus-visible:ring-white/40">
        {children}
      </span>
    </label>
  );
}
