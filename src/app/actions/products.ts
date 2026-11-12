"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { db } from "@/db";
import { product, productTypes, type ProductType } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { hasCompatibility, isInstrumental, MAX_GALLERY_PHOTOS, PLATFORMS, PLUGIN_FORMATS, youtubeId } from "@/lib/shop-format";
import { PRODUCTS_TAG, slugify } from "@/lib/shop";
import { deletePrivateFile } from "@/lib/private-storage";
import { TRIAL_DAY_CHOICES } from "@/lib/trial";
import { deleteUpload, saveUpload, UploadError } from "@/lib/storage";

type Result = { error: string } | { ok: true; id: string };

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const file = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
};

export async function saveProduct(formData: FormData): Promise<Result> {
  await requireAdmin();

  const id = text(formData, "id") || null;
  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  const type = text(formData, "type") as ProductType;
  const price = text(formData, "price").replace(",", ".");
  const genres = [
    ...new Set(
      text(formData, "genres")
        .split(",")
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (!name) return { error: "Le nom est obligatoire." };
  if (!slug) return { error: "L'adresse (slug) est invalide." };
  if (!productTypes.includes(type)) return { error: "Choisis un type de produit." };
  if (!/^\d+(\.\d{1,2})?$/.test(price)) return { error: "Prix invalide (ex : 29 ou 29,99)." };
  const bpm = isInstrumental(type) ? text(formData, "bpm") : "";
  if (bpm && !/^\d{2,3}$/.test(bpm)) return { error: "BPM invalide (ex : 140)." };
  // Le champ n'est envoyé que sur l'onglet YouTube : ailleurs, le lien ne bouge pas.
  const videoLink = formData.has("videoUrl") ? text(formData, "videoUrl") : null;
  const videoId = videoLink ? youtubeId(videoLink) : null;
  if (videoLink && !videoId) return { error: "Lien YouTube invalide." };

  const extraUrl = text(formData, "extraUrl");
  if (extraUrl && !/^https:\/\/[^\s]+$/i.test(extraUrl)) return { error: "Le lien externe doit commencer par https://." };
  const extraLabel = text(formData, "extraLabel").slice(0, 80);

  const [duplicate] = await db
    .select({ id: product.id })
    .from(product)
    .where(id ? and(eq(product.slug, slug), ne(product.id, id)) : eq(product.slug, slug));
  if (duplicate) return { error: "Un autre produit utilise déjà cette adresse (slug)." };

  const existing = id ? (await db.select().from(product).where(eq(product.id, id)))[0] : undefined;
  if (id && !existing) return { error: "Produit introuvable." };

  let coverFile = existing?.coverFile ?? null;
  let previewFile = existing?.previewFile ?? null;
  const newCover = file(formData, "cover");
  const newPreview = file(formData, "preview");

  try {
    if (newCover) coverFile = await saveUpload(newCover, "image");
    if (newPreview) previewFile = await saveUpload(newPreview, "audio");
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  if (newCover && existing?.coverFile) await deleteUpload(existing.coverFile);
  if ((newPreview || formData.get("removePreview") === "on") && existing?.previewFile) {
    await deleteUpload(existing.previewFile);
    if (!newPreview) previewFile = null;
  }

  const keptPhotos = formData.getAll("gallery");
  const galleryFiles = (existing?.galleryFiles ?? []).filter((f) => keptPhotos.includes(f));
  const removedPhotos = (existing?.galleryFiles ?? []).filter((f) => !keptPhotos.includes(f));

  const pick = (key: string, allowed: readonly { value: string }[]) =>
    hasCompatibility(type)
      ? allowed.map((a) => a.value).filter((v) => formData.getAll(key).includes(v))
      : [];

  const values = {
    name,
    slug,
    type,
    priceCents: Math.round(Number(price) * 100),
    shortDescription: text(formData, "shortDescription").slice(0, 160),
    description: text(formData, "description").slice(0, 5000),
    genres,
    platforms: pick("platforms", PLATFORMS),
    formats: pick("formats", PLUGIN_FORMATS),
    bpm: bpm ? Number(bpm) : null,
    musicalKey: (isInstrumental(type) && text(formData, "musicalKey").slice(0, 12)) || null,
    coverFile,
    previewFile,
    galleryFiles,
    videoUrl: videoLink === null ? (existing?.videoUrl ?? null) : videoId && `https://www.youtube.com/watch?v=${videoId}`,
    // Un lien YouTube remplace la vidéo envoyée.
    videoFile: videoId ? null : (existing?.videoFile ?? null),
    extraUrl: extraUrl.slice(0, 1000) || null,
    extraLabel: extraUrl ? extraLabel || null : null,
    published: formData.get("published") === "on",
    featured: formData.get("featured") === "on",
    trialDays: hasCompatibility(type) && TRIAL_DAY_CHOICES.includes(Number(text(formData, "trialDays")) as (typeof TRIAL_DAY_CHOICES)[number])
      ? Number(text(formData, "trialDays"))
      : null,
  };

  let savedId = existing?.id;
  if (existing) await db.update(product).set(values).where(eq(product.id, existing.id));
  else [{ id: savedId }] = await db.insert(product).values(values).returning({ id: product.id });

  await Promise.all(removedPhotos.map(deleteUpload));
  if (videoId) await deleteUpload(existing?.videoFile);

  updateTag(PRODUCTS_TAG);
  return { ok: true, id: savedId! };
}

/** Ajoute une photo à la galerie. Envoyées une par une pour rester sous la limite des Server Actions. */
export async function addProductPhoto(id: string, formData: FormData): Promise<{ error: string } | { file: string }> {
  await requireAdmin();
  const [row] = await db.select().from(product).where(eq(product.id, id));
  if (!row) return { error: "Produit introuvable." };
  if (row.galleryFiles.length >= MAX_GALLERY_PHOTOS) return { error: `${MAX_GALLERY_PHOTOS} photos maximum.` };
  const photo = file(formData, "photo");
  if (!photo) return { error: "Photo manquante." };

  try {
    const name = await saveUpload(photo, "image");
    await db.update(product).set({ galleryFiles: [...row.galleryFiles, name] }).where(eq(product.id, id));
    updateTag(PRODUCTS_TAG);
    return { file: name };
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
}

export async function removeProductVideo(id: string) {
  await requireAdmin();
  const [row] = await db.select().from(product).where(eq(product.id, id));
  if (!row?.videoFile) return;
  await db.update(product).set({ videoFile: null }).where(eq(product.id, id));
  await deleteUpload(row.videoFile);
  updateTag(PRODUCTS_TAG);
  refresh();
}

export async function setProductPublished(id: string, published: boolean) {
  await requireAdmin();
  await db.update(product).set({ published }).where(eq(product.id, id));
  updateTag(PRODUCTS_TAG);
  refresh();
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const [row] = await db.select().from(product).where(eq(product.id, id));
  if (!row) return;
  await db.delete(product).where(eq(product.id, id));
  await Promise.all([
    deleteUpload(row.coverFile),
    deleteUpload(row.previewFile),
    deleteUpload(row.videoFile),
    ...row.galleryFiles.map(deleteUpload),
    deletePrivateFile(row.downloadFile),
  ]);
  updateTag(PRODUCTS_TAG);
  refresh();
}

export async function removeProductFile(id: string) {
  await requireAdmin();
  const [row] = await db.select().from(product).where(eq(product.id, id));
  if (!row?.downloadFile) return;
  await db.update(product).set({ downloadFile: null, downloadName: null, downloadSize: null }).where(eq(product.id, id));
  await deletePrivateFile(row.downloadFile);
  updateTag(PRODUCTS_TAG);
  refresh();
}
