"use client";

import { useState } from "react";
import type { Bucket } from "@/lib/analytics";

const nf = new Intl.NumberFormat("fr-FR");

/** Arrondit le maximum de l'axe à une valeur lisible (5, 10, 20, 50…). */
function niceMax(n: number) {
  const value = Math.max(n, 5);
  const step = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 2.5, 5, 10].map((m) => m * step).find((x) => x >= value) ?? value;
}

/** Visiteurs par jour (ou par mois) : une barre par point, le détail au survol. */
export function VisitsChart({ buckets, monthly }: { buckets: Bucket[]; monthly: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...buckets.map((b) => b.visitors)));
  const active = hover !== null ? buckets[hover] : null;
  const short = (b: Bucket) => (monthly ? b.label : new Date(`${b.key}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }));
  const mid = buckets[Math.floor(buckets.length / 2)];

  return (
    <div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bottom-6 flex flex-col justify-between" aria-hidden>
          {[1, 0.5, 0].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-right text-[11px] text-muted tabular-nums">{nf.format(Math.round(max * f))}</span>
              <span className={`h-px flex-1 ${f === 0 ? "bg-white/25" : "bg-white/[0.06]"}`} />
            </div>
          ))}
        </div>

        <div className="relative ml-11 flex h-56 items-end gap-[2px] pb-6" onMouseLeave={() => setHover(null)}>
          {buckets.map((b, i) => (
            <button
              key={b.key}
              type="button"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${b.label} : ${b.visitors} visiteurs, ${b.views} pages vues`}
              className="group relative flex h-full flex-1 items-end outline-none"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${hover === i ? "bg-white" : "bg-white/70 group-focus-visible:bg-white"}`}
                style={{ height: `${b.visitors > 0 ? Math.max(2, (b.visitors / max) * 100) : 0}%` }}
              />
            </button>
          ))}

          {active && hover !== null && (
            <div
              className="pointer-events-none absolute bottom-full z-10 mb-2 w-44 -translate-x-1/2 rounded-xl border border-white/15 bg-surface-2 p-3 text-xs shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)]"
              style={{ left: `${Math.min(85, Math.max(15, ((hover + 0.5) / buckets.length) * 100))}%` }}
            >
              <p className="font-medium capitalize">{active.label}</p>
              <dl className="mt-2 space-y-1 text-muted">
                <div className="flex justify-between gap-3">
                  <dt>Visiteurs</dt>
                  <dd className="font-semibold text-foreground tabular-nums">{nf.format(active.visitors)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Pages vues</dt>
                  <dd className="text-foreground tabular-nums">{nf.format(active.views)}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-muted" aria-hidden>
            <span>{short(buckets[0])}</span>
            <span>{short(mid)}</span>
            <span>{monthly ? short(buckets[buckets.length - 1]) : "Aujourd'hui"}</span>
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Visiteurs et pages vues</caption>
        <thead>
          <tr>
            <th>Période</th>
            <th>Visiteurs</th>
            <th>Pages vues</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key}>
              <td>{b.label}</td>
              <td>{b.visitors}</td>
              <td>{b.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
