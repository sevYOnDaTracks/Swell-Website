import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Fichiers envoyés depuis l'admin (visuels, extraits audio), hors de /public
// pour être servis par la route /media/[file] en dev comme en prod.
const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

const TYPES = {
  image: {
    maxBytes: 5 * 1024 * 1024,
    mimes: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
  },
  audio: {
    maxBytes: 15 * 1024 * 1024,
    mimes: { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg" },
  },
} as const;

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

const FILE_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp|mp3|wav|ogg)$/;

export class UploadError extends Error {}

export async function saveUpload(file: File, kind: keyof typeof TYPES) {
  const rules = TYPES[kind];
  const ext = (rules.mimes as Record<string, string>)[file.type];
  if (!ext) throw new UploadError(kind === "image" ? "Image en JPG, PNG ou WebP uniquement." : "Audio en MP3, WAV ou OGG uniquement.");
  if (file.size > rules.maxBytes) {
    throw new UploadError(`Fichier trop lourd (max ${rules.maxBytes / 1024 / 1024} Mo).`);
  }

  const name = `${crypto.randomUUID()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function deleteUpload(name: string | null | undefined) {
  if (!name || !FILE_NAME.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}

export async function readUpload(name: string) {
  if (!FILE_NAME.test(name)) return null;
  try {
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}
