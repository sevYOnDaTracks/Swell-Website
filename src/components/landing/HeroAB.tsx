"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

// Les deux versions jouent en même temps et on bascule le volume :
// le passage avant / après tombe exactement au même endroit du morceau.
export function HeroAB({
  title,
  artist,
  before,
  after,
  bars,
}: {
  title: string;
  artist: string;
  before: string;
  after: string;
  bars: number[];
}) {
  const beforeRef = useRef<HTMLAudioElement>(null);
  const afterRef = useRef<HTMLAudioElement>(null);
  const [mixed, setMixed] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (beforeRef.current) beforeRef.current.muted = mixed;
    if (afterRef.current) afterRef.current.muted = !mixed;
  }, [mixed]);

  function both(fn: (a: HTMLAudioElement) => void) {
    for (const a of [beforeRef.current, afterRef.current]) if (a) fn(a);
  }

  function toggle() {
    if (playing) {
      both((a) => a.pause());
      return setPlaying(false);
    }
    const t = afterRef.current?.currentTime ?? 0;
    both((a) => {
      a.currentTime = t;
      void a.play().catch(() => setPlaying(false));
    });
    setPlaying(true);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const a = afterRef.current;
    if (!a?.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width) * a.duration;
    both((x) => (x.currentTime = t));
    setProgress(t / a.duration);
  }

  return (
    <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-white/10 bg-surface/70 p-4 text-left shadow-2xl shadow-black/40 backdrop-blur sm:p-5">
      <audio ref={beforeRef} src={before} preload="metadata" />
      <audio
        ref={afterRef}
        src={after}
        preload="metadata"
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
        onEnded={() => {
          both((a) => a.pause());
          setPlaying(false);
          setProgress(0);
        }}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Mettre en pause" : "Écouter l'avant / après"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-white/10 transition-transform hover:scale-105"
        >
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted">{artist}</p>
        </div>

        <div role="group" aria-label="Version" className="flex shrink-0 rounded-lg border border-white/10 bg-background/60 p-1 text-xs font-semibold">
          {[
            { label: "AVANT", value: false },
            { label: "APRÈS", value: true },
          ].map((v) => (
            <button
              key={v.label}
              type="button"
              aria-pressed={mixed === v.value}
              onClick={() => setMixed(v.value)}
              className={`rounded-md px-3 py-1.5 transition-colors ${mixed === v.value ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div onClick={seek} className="mt-4 flex h-16 cursor-pointer items-center gap-[3px] sm:gap-1" aria-hidden>
        {bars.map((h, i) => {
          const done = i / bars.length < progress;
          return (
            <span
              key={i}
              className={`flex-1 rounded-full transition-colors ${done ? (mixed ? "bg-white" : "bg-white/60") : "bg-white/15"}`}
              style={{ height: `${mixed ? h : Math.max(12, h * 0.55)}%` }}
            />
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Bascule entre AVANT et APRÈS pendant l&apos;écoute pour entendre la différence.</p>
    </div>
  );
}
