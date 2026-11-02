"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";

// Un seul extrait joue à la fois sur toute la page.
let current: { audio: HTMLAudioElement; stop: () => void } | null = null;

export function PreviewButton({ src, label, size = "md" }: { src: string; label: string; size?: "md" | "lg" }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => {
    if (current?.audio.src.endsWith(src)) current.stop();
  }, [src]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (playing && current) return current.stop();

    current?.stop();
    const audio = new Audio(src);
    const stop = () => {
      audio.pause();
      setPlaying(false);
      if (current?.audio === audio) current = null;
    };
    audio.addEventListener("ended", stop);
    current = { audio, stop };
    audio.play().then(() => setPlaying(true), stop);
  }

  const dims = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? `Mettre en pause ${label}` : `Écouter ${label}`}
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/40 transition-transform hover:scale-105`}
    >
      {playing ? <Pause size={size === "lg" ? 22 : 18} fill="currentColor" /> : <Play size={size === "lg" ? 22 : 18} fill="currentColor" className="ml-0.5" />}
    </button>
  );
}
