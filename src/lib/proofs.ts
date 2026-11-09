import "server-only";
import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { writeStream } from "./storage";

// Captures de paiement mobile money : privées (jamais servies par /media), lues par l'admin seulement.
const PROOF_DIR = path.join(process.cwd(), "storage", "proofs");
const MAX_PROOF_BYTES = 8 * 1024 * 1024;
const FILE_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/;

export const PROOF_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
export const PROOF_CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

export async function saveProof(body: ReadableStream<Uint8Array>, ext: string) {
  const name = `${crypto.randomUUID()}.${ext}`;
  await writeStream(body, path.join(PROOF_DIR, name), MAX_PROOF_BYTES, "8 Mo");
  return name;
}

export async function deleteProof(name: string | null | undefined) {
  if (!name || !FILE_NAME.test(name)) return;
  await unlink(path.join(PROOF_DIR, name)).catch(() => {});
}

export async function openProof(name: string) {
  if (!FILE_NAME.test(name)) return null;
  const file = path.join(PROOF_DIR, name);
  try {
    const { size } = await stat(file);
    return { size, ext: name.split(".").pop()!, stream: Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array> };
  } catch {
    return null;
  }
}
