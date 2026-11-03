import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// Fichiers livrés aux acheteurs (packs, installateurs). Stockés hors de
// storage/uploads pour ne jamais être accessibles par une adresse publique :
// le téléchargement passe toujours par une route qui vérifie les droits.
const PRIVATE_DIR = path.join(process.cwd(), "storage", "private");

export const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 Go
export const DOWNLOAD_EXTENSIONS = ["zip", "rar", "7z", "dmg", "pkg", "exe", "msi", "wav", "mp3"] as const;

const FILE_NAME = /^[a-f0-9-]{36}\.(zip|rar|7z|dmg|pkg|exe|msi|wav|mp3)$/;

export class PrivateUploadError extends Error {}

export function extensionOf(originalName: string) {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  return (DOWNLOAD_EXTENSIONS as readonly string[]).includes(ext) ? ext : null;
}

/** Écrit le flux sur le disque sans le charger en mémoire, en coupant au-delà de la taille max. */
export async function savePrivateStream(body: ReadableStream<Uint8Array>, ext: string) {
  await mkdir(PRIVATE_DIR, { recursive: true });
  const name = `${crypto.randomUUID()}.${ext}`;
  const target = path.join(PRIVATE_DIR, name);
  const temp = `${target}.part`;

  let size = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      size += chunk.length;
      if (size > MAX_DOWNLOAD_BYTES) cb(new PrivateUploadError("Fichier trop lourd (2 Go max)."));
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
    throw new PrivateUploadError("Fichier vide.");
  }
  await rename(temp, target);
  return { name, size };
}

export async function deletePrivateFile(name: string | null | undefined) {
  if (!name || !FILE_NAME.test(name)) return;
  await unlink(path.join(PRIVATE_DIR, name)).catch(() => {});
}

/** Flux de lecture d'un fichier privé, ou null s'il n'existe pas. */
export async function openPrivateFile(name: string) {
  if (!FILE_NAME.test(name)) return null;
  const file = path.join(PRIVATE_DIR, name);
  try {
    const { size } = await stat(file);
    return { size, stream: Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array> };
  } catch {
    return null;
  }
}
