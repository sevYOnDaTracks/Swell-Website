"use server";

import { asc, eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { db } from "@/db";
import { production } from "@/db/schema";
import { PRODUCTIONS_TAG } from "@/lib/productions";
import { requireAdmin } from "@/lib/session";
import { deleteUpload, saveUpload, UploadError } from "@/lib/storage";

type Result = { error: string } | { ok: true };

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const file = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
};

export async function saveProduction(formData: FormData): Promise<Result> {
  await requireAdmin();

  const id = text(formData, "id") || null;
  const title = text(formData, "title");
  const link = text(formData, "link") || null;
  if (!title) return { error: "Le titre est obligatoire." };
  if (link && !/^https:\/\/[^\s]+$/.test(link)) return { error: "Le lien doit commencer par https://" };

  const existing = id ? (await db.select().from(production).where(eq(production.id, id)))[0] : undefined;
  if (id && !existing) return { error: "Production introuvable." };

  let coverFile = existing?.coverFile ?? null;
  let audioFile = existing?.audioFile ?? null;
  const newCover = file(formData, "cover");
  const newAudio = file(formData, "audio");

  try {
    if (newCover) coverFile = await saveUpload(newCover, "image");
    if (newAudio) audioFile = await saveUpload(newAudio, "audio");
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  if (newCover && existing?.coverFile) await deleteUpload(existing.coverFile);
  if ((newAudio || formData.get("removeAudio") === "on") && existing?.audioFile) {
    await deleteUpload(existing.audioFile);
    if (!newAudio) audioFile = null;
  }

  const values = {
    title: title.slice(0, 120),
    artist: text(formData, "artist").slice(0, 120),
    role: text(formData, "role").slice(0, 60),
    link,
    coverFile,
    audioFile,
    published: formData.get("published") === "on",
  };

  if (existing) {
    await db.update(production).set(values).where(eq(production.id, existing.id));
  } else {
    // Une nouvelle production arrive en tête de liste.
    await db.update(production).set({ position: sql`${production.position} + 1` });
    await db.insert(production).values({ ...values, position: 0 });
  }

  updateTag(PRODUCTIONS_TAG);
  return { ok: true };
}

export async function deleteProduction(id: string) {
  await requireAdmin();
  const [row] = await db.select().from(production).where(eq(production.id, id));
  if (!row) return;
  await db.delete(production).where(eq(production.id, id));
  await Promise.all([deleteUpload(row.coverFile), deleteUpload(row.audioFile)]);
  updateTag(PRODUCTIONS_TAG);
  refresh();
}

export async function setProductionPublished(id: string, published: boolean) {
  await requireAdmin();
  await db.update(production).set({ published }).where(eq(production.id, id));
  updateTag(PRODUCTIONS_TAG);
  refresh();
}

export async function moveProduction(id: string, direction: -1 | 1) {
  await requireAdmin();
  const rows = await db.select({ id: production.id }).from(production).orderBy(asc(production.position));
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1 || !rows[index + direction]) return;
  const ordered = rows.map((r) => r.id);
  [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
  await Promise.all(ordered.map((rowId, position) => db.update(production).set({ position }).where(eq(production.id, rowId))));
  updateTag(PRODUCTIONS_TAG);
  refresh();
}
