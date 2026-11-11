import "server-only";
import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { writeStream } from "./storage";

// Fichiers livrés aux acheteurs (packs, installateurs). Stockés hors de
// storage/uploads pour ne jamais être accessibles par une adresse publique :
// le téléchargement passe toujours par une route qui vérifie les droits.
const PRIVATE_DIR = path.join(process.cwd(), "storage", "private");

export const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 Go
export const DOWNLOAD_EXTENSIONS = ["zip", "rar", "7z", "dmg", "pkg", "exe", "msi", "wav", "mp3"] as const;
// Fichiers rendus au client après une séance : audio et archives (stems).
export const SESSION_EXTENSIONS = ["wav", "mp3", "aif", "aiff", "flac", "m4a", "zip", "rar", "7z"] as const;

const FILE_NAME = /^[a-f0-9-]{36}\.(zip|rar|7z|dmg|pkg|exe|msi|wav|mp3|aif|aiff|flac|m4a)$/;

export function extensionOf(originalName: string, allowed: readonly string[] = DOWNLOAD_EXTENSIONS) {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  return allowed.includes(ext) ? ext : null;
}

export async function savePrivateStream(body: ReadableStream<Uint8Array>, ext: string) {
  const name = `${crypto.randomUUID()}.${ext}`;
  const size = await writeStream(body, path.join(PRIVATE_DIR, name), MAX_DOWNLOAD_BYTES, "2 Go");
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
