"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2, Upload } from "lucide-react";
import { removeProductVideo } from "@/app/actions/products";
import { mediaUrl } from "@/lib/shop-format";
import { useFileUpload } from "./useFileUpload";

const MODES = [
  { value: "youtube", label: "Lien YouTube" },
  { value: "file", label: "Mon fichier" },
] as const;

/** Vidéo de présentation : un lien YouTube (enregistré avec le formulaire) ou un fichier (envoyé tout de suite). */
export function ProductVideoField({
  productId,
  videoUrl,
  videoFile,
  inputClassName,
}: {
  productId?: string;
  videoUrl: string | null;
  videoFile: string | null;
  inputClassName: string;
}) {
  const [mode, setMode] = useState<"youtube" | "file">(videoFile ? "file" : "youtube");

  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-5">
      <p className="text-sm font-medium">Vidéo de présentation</p>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-white/10 p-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={mode === m.value}
            onClick={() => setMode(m.value)}
            className={`rounded-md px-2 py-1.5 text-xs transition-colors ${mode === m.value ? "bg-white font-medium text-black" : "text-muted hover:text-foreground"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "youtube" ? (
        <>
          <input
            name="videoUrl"
            inputMode="url"
            defaultValue={videoUrl ?? ""}
            placeholder="https://youtu.be/…"
            aria-label="Lien de la vidéo YouTube"
            className={inputClassName}
          />
          <p className="mt-2 text-xs text-muted">
            {videoFile ? "Enregistrer un lien remplacera ta vidéo envoyée." : "Laisse vide pour ne pas afficher de vidéo."}
          </p>
        </>
      ) : productId ? (
        <VideoUpload productId={productId} videoFile={videoFile} hasLink={Boolean(videoUrl)} />
      ) : (
        <p className="mt-3 text-sm text-muted">Crée d&apos;abord le produit : tu pourras ensuite y envoyer ta vidéo.</p>
      )}
    </div>
  );
}

function VideoUpload({ productId, videoFile, hasLink }: { productId: string; videoFile: string | null; hasLink: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const { progress, error, upload } = useFileUpload(`/api/admin/products/${productId}/video`);
  const [removing, startRemove] = useTransition();

  return (
    <>
      {videoFile && progress === null && (
        <div className="mt-3">
          <video src={mediaUrl(videoFile)} controls playsInline preload="metadata" className="w-full rounded-lg bg-black" />
          <button
            type="button"
            disabled={removing}
            onClick={() => {
              if (confirm("Supprimer la vidéo ?")) startRemove(() => removeProductVideo(productId));
            }}
            className="mt-2 flex items-center gap-1.5 text-xs text-muted hover:text-foreground disabled:opacity-40"
          >
            <Trash2 size={13} /> Supprimer la vidéo
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
          {videoFile ? "Remplacer la vidéo" : "Envoyer une vidéo"}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
      <p className="mt-2 text-xs text-muted">
        MP4 ou WebM, 500 Mo max.{hasLink && " L'envoi remplacera le lien YouTube."}
      </p>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </>
  );
}
