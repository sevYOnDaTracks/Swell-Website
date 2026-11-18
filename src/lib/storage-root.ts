import "server-only";
import path from "node:path";

// Dossier des fichiers du site (visuels, installateurs, preuves de paiement), réglé par STORAGE_DIR.
// En production il est HORS du projet (/home/swell/storage) : dans le projet, le build Turbopack
// parcourt ces Go de fichiers et manque de mémoire. Aucune valeur par défaut écrite ici, exprès :
// tout chemin écrit en dur est analysé par le build. En développement : STORAGE_DIR=storage.
export function storageDir(sub: "uploads" | "private" | "proofs") {
  const root = process.env.STORAGE_DIR;
  if (!root) throw new Error("STORAGE_DIR manquant : indique le dossier des fichiers dans .env.local (ex. STORAGE_DIR=storage)");
  return path.join(root, sub);
}
