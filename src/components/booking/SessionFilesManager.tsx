"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, FileAudio, Mail, Trash2, Upload } from "lucide-react";
import { notifySessionFiles, removeSessionFile } from "@/app/actions/session-files";
import { formatBytes } from "@/lib/shop-format";

const ACCEPT = ".wav,.mp3,.aif,.aiff,.flac,.m4a,.zip,.rar,.7z";
const button =
  "inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 disabled:opacity-40";

/** Envoie un fichier en flux vers la route admin ; renvoie un message d'erreur ou null. */
function putFile(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<string | null>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve(null);
      try {
        resolve(JSON.parse(xhr.responseText).error ?? "L'envoi a échoué.");
      } catch {
        resolve(xhr.status === 413 ? "Fichier trop lourd." : "L'envoi a échoué.");
      }
    };
    xhr.onerror = () => resolve("Connexion interrompue pendant l'envoi.");
    xhr.send(file);
  });
}

/** Fichiers rendus au client après la séance : dépôt (plusieurs à la fois), suppression, e-mail au client. */
export function SessionFilesManager({
  bookingId,
  files,
}: {
  bookingId: string;
  files: { id: string; name: string; size: number }[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<{ name: string; index: number; total: number; pct: number } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function send(list: File[]) {
    setMessage(null);
    const errors: string[] = [];
    for (const [i, f] of list.entries()) {
      setUpload({ name: f.name, index: i + 1, total: list.length, pct: 0 });
      const error = await putFile(`/api/admin/bookings/${bookingId}/files`, f, (pct) =>
        setUpload((u) => (u ? { ...u, pct } : u)),
      );
      if (error) errors.push(`${f.name} : ${error}`);
    }
    setUpload(null);
    if (errors.length) setMessage({ ok: false, text: errors.join(" · ") });
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-xl border border-white/5 bg-background/40 p-3">
      <p className="text-xs font-medium text-muted">Fichiers du client</p>

      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm">
              <FileAudio size={15} className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted">{formatBytes(f.size)}</span>
              <a
                href={`/api/seances/fichiers/${f.id}`}
                className="rounded-md p-1 text-muted hover:bg-white/10 hover:text-foreground"
                aria-label={`Télécharger ${f.name}`}
                title="Télécharger"
              >
                <Download size={14} />
              </a>
              <button
                type="button"
                disabled={pending || !!upload}
                onClick={() => {
                  if (confirm(`Supprimer « ${f.name} » ? Le client ne pourra plus le télécharger.`)) {
                    start(() => removeSessionFile(f.id));
                  }
                }}
                className="rounded-md p-1 text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-40"
                aria-label={`Supprimer ${f.name}`}
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {upload ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-white transition-[width]" style={{ width: `${upload.pct}%` }} />
          </div>
          <p className="mt-1.5 truncate text-xs text-muted">
            Envoi {upload.total > 1 ? `${upload.index}/${upload.total} ` : ""}— {upload.name} · {upload.pct} %
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} className={button}>
            <Upload size={13} /> {files.length ? "Ajouter des fichiers" : "Déposer des fichiers"}
          </button>
          {files.length > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await notifySessionFiles(bookingId);
                  setMessage("error" in result ? { ok: false, text: result.error } : { ok: true, text: "E-mail envoyé au client." });
                })
              }
              className={button}
            >
              <Mail size={13} /> Prévenir le client
            </button>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (list.length) void send(list);
        }}
      />
      <p className="mt-2 text-xs text-muted">WAV, MP3, AIFF, FLAC, M4A, ZIP, RAR ou 7Z · 2 Go max par fichier.</p>
      {message && <p className={`mt-2 text-xs ${message.ok ? "text-foreground" : "text-red-300"}`}>{message.text}</p>}
    </div>
  );
}
