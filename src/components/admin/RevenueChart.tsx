"use client";

import { useState } from "react";
import type { DayRevenue } from "@/lib/admin-dashboard";

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurosCents = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const dayLabel = (day: string, long = false) =>
  new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" });

/** Arrondit le maximum de l'axe à une valeur lisible (10, 20, 50, 100…). */
function niceMax(cents: number) {
  const value = Math.max(cents / 100, 10);
  const step = 10 ** Math.floor(Math.log10(value));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((n) => n >= value) ?? value;
  return nice * 100;
}

/** Chiffre d'affaires des 30 derniers jours : une barre par jour, le détail au survol. */
export function RevenueChart({ days }: { days: DayRevenue[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = days.map((d) => d.shop + d.subscriptions + d.sessions);
  const max = niceMax(Math.max(...totals));
  const active = hover !== null ? days[hover] : null;

  return (
    <div>
      <div className="relative">
        {/* Grille discrète et graduations de l'axe. */}
        <div className="pointer-events-none absolute inset-0 bottom-6 flex flex-col justify-between" aria-hidden>
          {[1, 0.5, 0].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-right text-[11px] text-muted tabular-nums">{euros.format((max * f) / 100)}</span>
              <span className={`h-px flex-1 ${f === 0 ? "bg-white/25" : "bg-white/[0.06]"}`} />
            </div>
          ))}
        </div>

        <div className="relative ml-[3.75rem] flex h-56 items-end gap-[2px] pb-6" onMouseLeave={() => setHover(null)}>
          {days.map((d, i) => {
            const total = totals[i];
            const height = total > 0 ? Math.max(2, (total / max) * 100) : 0;
            return (
              <button
                key={d.day}
                type="button"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${dayLabel(d.day, true)} : ${eurosCents.format(total / 100)}`}
                className="group relative flex h-full flex-1 items-end outline-none"
              >
                <span
                  className={`block w-full rounded-t-[4px] transition-colors ${hover === i ? "bg-white" : "bg-white/70 group-focus-visible:bg-white"}`}
                  style={{ height: `${height}%` }}
                />
              </button>
            );
          })}

          {active && hover !== null && (
            <div
              className="pointer-events-none absolute bottom-full z-10 mb-2 w-52 -translate-x-1/2 rounded-xl border border-white/15 bg-surface-2 p-3 text-xs shadow-[0_12px_30px_-10px_rgba(0,0,0,0.8)]"
              style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
            >
              <p className="font-medium capitalize">{dayLabel(active.day, true)}</p>
              <p className="mt-1 text-base font-semibold tabular-nums">{eurosCents.format(totals[hover] / 100)}</p>
              <dl className="mt-2 space-y-1 text-muted">
                {(
                  [
                    ["Boutique", active.shop],
                    ["Abonnements", active.subscriptions],
                    ["Séances", active.sessions],
                  ] as const
                ).map(([label, v]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt>{label}</dt>
                    <dd className="text-foreground tabular-nums">{eurosCents.format(v / 100)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-muted" aria-hidden>
            <span>{dayLabel(days[0].day)}</span>
            <span>{dayLabel(days[14].day)}</span>
            <span>Aujourd&apos;hui</span>
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Chiffre d&apos;affaires par jour sur 30 jours</caption>
        <thead>
          <tr>
            <th>Jour</th>
            <th>Boutique</th>
            <th>Abonnements</th>
            <th>Séances</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.day}>
              <td>{dayLabel(d.day, true)}</td>
              <td>{eurosCents.format(d.shop / 100)}</td>
              <td>{eurosCents.format(d.subscriptions / 100)}</td>
              <td>{eurosCents.format(d.sessions / 100)}</td>
              <td>{eurosCents.format(totals[i] / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
