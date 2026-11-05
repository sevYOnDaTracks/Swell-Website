"use client";

import { useRef, useTransition } from "react";
import { Download, FileArchive, Trash2, Upload } from "lucide-react";
import { removeProductFile } from "@/app/actions/products";
import { formatBytes } from "@/lib/shop-format";
import { useFileUpload } from "./useFileUpload";

const ACCEPT = ".zip,.rar,.7z,.dmg,.pkg,.exe,.msi,.wav,.mp3";

/** Envoi du fichier livré à l'acheteur, en direct vers le serveur avec progression. */
export function DeliverableUpload({
  productId,
  current,
}: {
  productId: string;
  current: { name: string; size: number } | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { progress, error, upload } = useFileUpload(`/api/admin/products/${productId}/file`);
  const [removing, startRemove] = useTransition();

  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-5">
      <p className="text-sm font-medium">Fichier à livrer</p>
      <p className="mt-1 text-xs text-muted">Le pack que reçoit l&apos;acheteur. Stocké en privé, jamais visible publiquement.</p>

      {current && progress === null && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-background/40 px-3 py-2.5">
          <FileArchive size={18} className="shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{current.name}</p>
            <p className="text-xs text-muted">{formatBytes(current.size)}</p>
          </div>
          <a
            href={`/api/admin/products/${productId}/file`}
            className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground"
            aria-label="Télécharger le fichier"
            title="Télécharger"
          >
            <Download size={15} />
          </a>
          <button
            type="button"
            disabled={removing}
            onClick={() => {
              if (confirm("Supprimer le fichier à livrer ?")) startRemove(() => removeProductFile(productId));
            }}
            className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-40"
            aria-label="Supprimer le fichier"
            title="Supprimer"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {progress !== null ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-white transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">Envoi en cours… {progress} %</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
        >
          <Upload size={16} className="text-muted" />
          {current ? "Remplacer le fichier" : "Envoyer le fichier"}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f, { "x-file-name": encodeURIComponent(f.name) });
        }}
      />
      <p className="mt-2 text-xs text-muted">ZIP, RAR, 7Z, DMG, PKG, EXE, MSI, WAV ou MP3 · 2 Go max.</p>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
