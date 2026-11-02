// Fenêtre de session de mixage façon FL Studio (playlist + table de mixage), dessinée
// en HTML/CSS pour rester nette à toutes les tailles. Purement décorative.

const MENU = ["FILE", "EDIT", "ADD", "PATTERNS", "VIEW", "OPTIONS", "TOOLS", "HELP"];

// Pistes de la playlist : nom et clips [début, longueur] en mesures (sur 16).
const TRACKS: { name: string; clips: [number, number][] }[] = [
  { name: "Lead Vox", clips: [[4, 4], [9, 7]] },
  { name: "Adlibs", clips: [[5, 2], [10, 2], [13, 3]] },
  { name: "808", clips: [[0, 8], [8, 8]] },
  { name: "Drums", clips: [[0, 4], [4, 4], [8, 4], [12, 4]] },
  { name: "Pad", clips: [[0, 16]] },
];

// Tranches de la table de mixage : nom et position du fader (0-1).
const STRIPS = [
  { name: "Master", level: 0.78 },
  { name: "Kick", level: 0.7 },
  { name: "808", level: 0.66 },
  { name: "Snare", level: 0.62 },
  { name: "Hats", level: 0.5 },
  { name: "Pad", level: 0.45 },
  { name: "Lead Vox", level: 0.74 },
  { name: "Adlibs", level: 0.58 },
  { name: "Rev Bus", level: 0.52 },
];

const INSERTS = ["EQ paramétrique", "Compresseur", "De-esser", "Swell Ad-lib FX", "Swell Reverse", "Limiteur"];

// Hauteurs fixes (pas d'aléatoire) pour éviter un décalage serveur / client.
const wave = (seed: number, n: number) =>
  Array.from({ length: n }, (_, i) => 25 + Math.round(Math.abs(Math.sin((i + seed) * 1.3) * Math.cos((i + seed) * 0.45)) * 75));

export function StudioSession() {
  return (
    <div
      aria-hidden
      className="w-[880px] overflow-hidden rounded-xl border border-white/10 bg-[#141414] text-[10px] text-neutral-300 shadow-2xl shadow-black/70"
    >
      {/* Barre de titre et barre d'outils */}
      <div className="flex items-center gap-4 border-b border-white/10 bg-[#1b1b1b] px-3 py-2">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full bg-white/20" />
          ))}
        </div>
        <div className="flex gap-3 font-semibold tracking-wide text-neutral-400">
          {MENU.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded bg-white/90 px-1.5 py-0.5 font-bold text-black">SONG</span>
          <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10">▶</span>
          <span className="flex h-5 w-5 items-center justify-center rounded bg-white/10">■</span>
          <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[12px] text-white">140.000</span>
          <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[12px] text-white">0:42:08</span>
        </div>
      </div>

      <div className="flex">
        {/* Navigateur */}
        <div className="w-36 shrink-0 space-y-1.5 border-r border-white/10 bg-[#171717] p-3 text-neutral-400">
          <p className="mb-2 font-semibold tracking-wide text-neutral-500">BROWSER</p>
          {["Current project", "Recent files", "Plugin database", "Swell", "Packs", "Clipboard files"].map((f, i) => (
            <p key={f} className={i === 3 ? "text-white" : ""}>
              {i === 3 ? "▾" : "▸"} {f}
            </p>
          ))}
          <div className="space-y-1.5 pl-3 text-neutral-300">
            <p>Swell Chord Motion</p>
            <p>Swell Reverse</p>
            <p>Swell Ad-lib FX</p>
            <p>Swell Key</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {/* Playlist */}
          <div className="border-b border-white/10">
            <div className="flex items-center justify-between bg-[#1b1b1b] px-3 py-1.5 text-neutral-400">
              <span className="font-semibold">Playlist · Arrangement › Mix final</span>
              <span>Pattern 1</span>
            </div>
            <div className="relative">
              <div className="ml-20 flex border-b border-white/5 text-neutral-500">
                {Array.from({ length: 16 }, (_, i) => (
                  <span key={i} className="flex-1 border-l border-white/5 px-1 py-0.5">
                    {i + 1}
                  </span>
                ))}
              </div>
              {TRACKS.map((t, row) => (
                <div key={t.name} className="flex h-9 border-b border-white/5">
                  <span className="flex w-20 shrink-0 items-center border-r border-white/10 bg-[#1b1b1b] px-2 text-neutral-300">{t.name}</span>
                  <div className="relative flex-1">
                    {t.clips.map(([start, len], i) => (
                      <div
                        key={i}
                        className="absolute inset-y-1 flex items-center gap-[1px] overflow-hidden rounded-sm border border-white/25 bg-white/[0.12] px-1"
                        style={{ left: `${(start / 16) * 100}%`, width: `calc(${(len / 16) * 100}% - 2px)` }}
                      >
                        {wave(row * 7 + i * 3, len * 6).map((h, j) => (
                          <span key={j} className="w-[2px] shrink-0 rounded-full bg-white/60" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <span className="studio-playhead absolute top-0 bottom-0 left-20 w-px bg-white" />
            </div>
          </div>

          {/* Table de mixage */}
          <div className="flex">
            <div className="flex flex-1 gap-1 bg-[#111] p-2">
              {STRIPS.map((s, i) => (
                <div
                  key={s.name}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-sm px-1 py-2 ${
                    s.name === "Lead Vox" ? "bg-white/[0.08] ring-1 ring-white/30" : "bg-white/[0.03]"
                  }`}
                >
                  <span className="text-neutral-500">{i === 0 ? "M" : i}</span>
                  <span className="h-4 w-4 rounded-full border border-white/30" />
                  <div className="flex h-28 items-end gap-1">
                    {[0, 1].map((c) => (
                      <span key={c} className="relative h-full w-1 overflow-hidden rounded-full bg-black/60">
                        <span
                          className="studio-meter absolute inset-x-0 bottom-0 h-full origin-bottom rounded-full bg-gradient-to-t from-neutral-500 to-white"
                          style={{ animationDelay: `${(i * 0.17 + c * 0.09) % 1}s`, animationDuration: `${0.7 + (i % 4) * 0.15}s` }}
                        />
                      </span>
                    ))}
                    <span className="relative ml-1 h-full w-1 rounded-full bg-black/60">
                      <span
                        className="absolute left-1/2 h-2.5 w-4 -translate-x-1/2 rounded-sm border border-white/40 bg-neutral-300"
                        style={{ bottom: `calc(${s.level * 100}% - 5px)` }}
                      />
                    </span>
                  </div>
                  <span className="w-full truncate text-center text-neutral-300">{s.name}</span>
                </div>
              ))}
            </div>
            <div className="w-40 shrink-0 space-y-1 border-l border-white/10 bg-[#171717] p-2">
              <p className="mb-1.5 font-semibold text-neutral-400">Insert 6 · Lead Vox</p>
              {INSERTS.map((p, i) => (
                <p
                  key={p}
                  className={`flex items-center gap-1.5 rounded-sm px-1.5 py-1 ${p.startsWith("Swell") ? "bg-white/15 text-white" : "bg-white/[0.04]"}`}
                >
                  <span className="text-neutral-500">{i + 1}</span>
                  {p}
                </p>
              ))}
              {[7, 8].map((n) => (
                <p key={n} className="rounded-sm bg-white/[0.02] px-1.5 py-1 text-neutral-600">
                  {n} (none)
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
