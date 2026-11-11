"use client";

/** Lecteur d'un son du client : lancer un morceau met les autres en pause. */
export function SongPlayer({ src, label }: { src: string; label: string }) {
  return (
    <audio
      controls
      preload="none"
      src={src}
      aria-label={`Écouter ${label}`}
      className="h-10 w-full [color-scheme:dark]"
      onPlay={(e) =>
        document.querySelectorAll("audio").forEach((a) => {
          if (a !== e.currentTarget) a.pause();
        })
      }
    />
  );
}
