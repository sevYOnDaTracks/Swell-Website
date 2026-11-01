"use client";

import { useState, useTransition } from "react";
import { saveWeeklyHours } from "@/app/actions/booking";

type Hours = { weekday: number; enabled: boolean; startTime: string; endTime: string };

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // on commence la semaine le lundi

const timeInput =
  "rounded-lg border border-white/10 bg-background/60 px-2.5 py-2 text-sm tabular-nums outline-none focus:border-white/50 disabled:opacity-30 [color-scheme:dark]";

export function WeeklyHoursForm({ hours }: { hours: Hours[] }) {
  const [enabled, setEnabled] = useState(() => hours.map((h) => h.enabled));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      // onSubmit plutôt que action : React réinitialiserait le formulaire après l'envoi.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        start(async () => {
          const result = await saveWeeklyHours(formData);
          setMessage("error" in result ? { ok: false, text: result.error } : { ok: true, text: "Horaires enregistrés." });
        });
      }}
      className="max-w-2xl rounded-2xl border border-white/5 bg-surface p-6"
    >
      <ul className="divide-y divide-white/5">
        {ORDER.map((weekday) => {
          const h = hours[weekday];
          return (
            <li key={weekday} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <label className="flex w-36 items-center gap-3 font-medium">
                <input
                  type="checkbox"
                  name={`enabled-${weekday}`}
                  checked={enabled[weekday]}
                  onChange={(e) => setEnabled((prev) => prev.map((v, i) => (i === weekday ? e.target.checked : v)))}
                  className="h-4 w-4 accent-white"
                />
                {DAYS[weekday]}
              </label>
              <div className="flex items-center gap-2 text-sm text-muted">
                <input type="time" name={`start-${weekday}`} defaultValue={h.startTime} step={1800} className={timeInput} disabled={!enabled[weekday]} />
                à
                <input type="time" name={`end-${weekday}`} defaultValue={h.endTime} step={1800} className={timeInput} disabled={!enabled[weekday]} />
              </div>
              {/* les champs désactivés ne sont pas envoyés : on garde leur valeur */}
              {!enabled[weekday] && (
                <>
                  <input type="hidden" name={`start-${weekday}`} value={h.startTime} />
                  <input type="hidden" name={`end-${weekday}`} value={h.endTime} />
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-foreground" : "text-red-300"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
