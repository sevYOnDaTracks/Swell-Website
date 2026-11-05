import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// Fichiers envoyés depuis l'admin (visuels, extraits audio, vidéos), hors de
// /public pour être servis par la route /media/[file] en dev comme en prod.
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

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const VIDEO_MIMES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
};

const FILE_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp|mp3|wav|ogg|mp4|webm)$/;

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

/** Écrit le flux sur le disque sans le charger en mémoire, en coupant au-delà de la taille max. */
export async function writeStream(body: ReadableStream<Uint8Array>, target: string, maxBytes: number, maxLabel: string) {
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.part`;

  let size = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > maxBytes) cb(new UploadError(`Fichier trop lourd (${maxLabel} max).`));
      else cb(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), limit, createWriteStream(temp));
  } catch (e) {
    await unlink(temp).catch(() => {});
    throw e;
  }
  if (size === 0) {
    await unlink(temp).catch(() => {});
    throw new UploadError("Fichier vide.");
  }
  await rename(temp, target);
  return size;
}

/** Vidéo de présentation : écrite en flux, trop lourde pour passer par une Server Action. */
export async function saveVideoStream(body: ReadableStream<Uint8Array>, mime: string, declaredBytes: number) {
  const ext = VIDEO_MIMES[mime];
  if (!ext) throw new UploadError("Vidéo en MP4 ou WebM uniquement.");
  if (declaredBytes > MAX_VIDEO_BYTES) throw new UploadError("Fichier trop lourd (500 Mo max).");

  const name = `${crypto.randomUUID()}.${ext}`;
  await writeStream(body, path.join(UPLOAD_DIR, name), MAX_VIDEO_BYTES, "500 Mo");
  return name;
}

export async function deleteUpload(name: string | null | undefined) {
  if (!name || !FILE_NAME.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}

/** Taille d'un fichier envoyé, ou null s'il n'existe pas. */
export async function uploadSize(name: string) {
  if (!FILE_NAME.test(name)) return null;
  try {
    return (await stat(path.join(UPLOAD_DIR, name))).size;
  } catch {
    return null;
  }
}

/** Flux de lecture (bornes incluses) : une vidéo ne doit pas être chargée en mémoire à chaque requête. */
export function streamUpload(name: string, start: number, end: number) {
  return Readable.toWeb(createReadStream(path.join(UPLOAD_DIR, name), { start, end })) as ReadableStream<Uint8Array>;
}
