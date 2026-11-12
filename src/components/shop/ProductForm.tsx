"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImagePlus, Loader2, Music, X } from "lucide-react";
import { addProductPhoto, saveProduct } from "@/app/actions/products";
import type { ProductType } from "@/db/schema";
import {
  hasCompatibility,
  isInstrumental,
  MAX_GALLERY_PHOTOS,
  MAX_PHOTO_BYTES,
  mediaUrl,
  PLATFORMS,
  PLUGIN_FORMATS,
  productTypeLabels,
} from "@/lib/shop-format";
import { DeliverableUpload } from "./DeliverableUpload";
import { ProductVideoField } from "./ProductVideoField";
import { TRIAL_DAY_CHOICES } from "@/lib/trial";

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
  galleryFiles: string[];
  videoUrl: string | null;
  videoFile: string | null;
  downloadFile: string | null;
  downloadName: string | null;
  downloadSize: number | null;
  extraUrl: string | null;
  extraLabel: string | null;
  published: boolean;
  featured: boolean;
  trialDays: number | null;
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
  // Après un envoi interrompu, le produit existe déjà : un nouvel essai doit le modifier, pas le recréer.
  const [savedId, setSavedId] = useState(product?.id ?? null);
  const [gallery, setGallery] = useState(product?.galleryFiles ?? []);
  const [newPhotos, setNewPhotos] = useState<{ file: File; url: string }[]>([]);
  const [photoStep, setPhotoStep] = useState<string | null>(null);
  const photoCount = gallery.length + newPhotos.length;

  function addPhotos(files: File[]) {
    const tooBig = files.find((f) => f.size > MAX_PHOTO_BYTES);
    setError(tooBig ? `${tooBig.name} : trop lourde (max 5 Mo).` : null);
    const added = files.filter((f) => f.size <= MAX_PHOTO_BYTES).slice(0, MAX_GALLERY_PHOTOS - photoCount);
    setNewPhotos((photos) => [...photos, ...added.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    start(async () => {
      const result = await saveProduct(formData);
      if ("error" in result) return setError(result.error);
      setSavedId(result.id);

      // Une photo à la fois : ensemble, elles dépasseraient la limite de 25 Mo des Server Actions.
      for (const [i, photo] of newPhotos.entries()) {
        setPhotoStep(`Envoi des photos ${i + 1}/${newPhotos.length}…`);
        const data = new FormData();
        data.set("photo", photo.file);
        const sent = await addProductPhoto(result.id, data);
        if ("error" in sent) {
          setPhotoStep(null);
          return setError(`${photo.file.name} : ${sent.error}`);
        }
        setGallery((files) => [...files, sent.file]);
        setNewPhotos((photos) => photos.filter((p) => p !== photo));
      }
      setPhotoStep(null);

      // Next garde les pages quittées en mémoire, état compris : sans ça, le prochain
      // « Nouveau produit » rouvrirait ce formulaire et modifierait le produit qu'on vient de créer.
      if (!product) {
        form.reset();
        setSavedId(null);
        setGallery([]);
        setCoverPreview(null);
        setAudioName(null);
        setType("drumkit");
      }

      // Nouveau produit : on ouvre sa fiche pour pouvoir y joindre le fichier à livrer.
      router.push(product ? "/admin/produits" : `/admin/produits/${result.id}?nouveau=1`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {savedId && <input type="hidden" name="id" value={savedId} />}

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
            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Démo</span>
              <select name="trialDays" defaultValue={product?.trialDays ?? 0} className={input}>
                <option value={0}>Pas de démo</option>
                {TRIAL_DAY_CHOICES.map((d) => (
                  <option key={d} value={d}>
                    Essai gratuit de {d} jours (compte connecté)
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">
                Ajoute un bouton « Essayer » sur la fiche : une clé d&apos;essai pour 1 ordinateur, un seul essai par compte.
              </span>
            </label>
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
          <p className="text-sm font-medium">Autres photos</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {gallery.map((file) => (
              <PhotoThumb key={file} src={mediaUrl(file)} onRemove={() => setGallery((files) => files.filter((f) => f !== file))}>
                <input type="hidden" name="gallery" value={file} />
              </PhotoThumb>
            ))}
            {newPhotos.map((photo) => (
              <PhotoThumb key={photo.url} src={photo.url} onRemove={() => setNewPhotos((photos) => photos.filter((p) => p !== photo))} />
            ))}
            {photoCount < MAX_GALLERY_PHOTOS && (
              <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/15 bg-background/40 text-muted transition-colors hover:border-white/40">
                <ImagePlus size={18} />
                <span className="sr-only">Ajouter des photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    addPhotos(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">Jusqu&apos;à {MAX_GALLERY_PHOTOS} photos, 5 Mo max chacune. Elles s&apos;affichent dans l&apos;ordre d&apos;ajout.</p>
        </div>

        <ProductVideoField
          productId={product?.id}
          videoUrl={product?.videoUrl ?? null}
          videoFile={product?.videoFile ?? null}
          inputClassName={input}
        />

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

        <div className="rounded-2xl border border-white/5 bg-surface p-5">
          <p className="text-sm font-medium">Lien externe</p>
          <p className="mt-1 text-xs text-muted">
            Pour un fichier trop lourd pour le site (banque de sons, pack de plus de 2 Go) hébergé ailleurs, par exemple sur Cloudflare R2.
            Seuls les acheteurs le voient, à côté du téléchargement.
          </p>
          <label className="mt-3 block text-sm">
            Texte du bouton
            <input name="extraLabel" maxLength={80} defaultValue={product?.extraLabel ?? ""} placeholder="Banque de sons (8 Go)" className={input} />
          </label>
          <label className="mt-3 block text-sm">
            Adresse
            <input name="extraUrl" type="url" inputMode="url" defaultValue={product?.extraUrl ?? ""} placeholder="https://…" className={input} />
          </label>
          <p className="mt-2 text-xs text-muted">Laisse vide pour ne rien afficher.</p>
        </div>

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
            {photoStep ?? (product ? "Enregistrer" : "Créer le produit")}
          </button>
          <Link href="/admin/produits" className="rounded-lg border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5">
            Annuler
          </Link>
        </div>
      </aside>
    </form>
  );
}

function PhotoThumb({ src, onRemove, children }: { src: string; onRemove: () => void; children?: React.ReactNode }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element -- peut être un aperçu local (blob:) */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Retirer la photo"
        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
      >
        <X size={12} />
      </button>
      {children}
    </div>
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
