"use client";

import { useSyncExternalStore } from "react";
import { setStatsAllowed, statsAllowed } from "./track";

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Interrupteur « être compté dans les statistiques » (gardé dans ce navigateur). */
export function StatsOptOut() {
  const allowed = useSyncExternalStore(subscribe, statsAllowed, () => true);
  return (
    <label className="mt-3 flex w-fit cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-sm">
      <input
        type="checkbox"
        checked={allowed}
        onChange={(e) => {
          setStatsAllowed(e.target.checked);
          listeners.forEach((l) => l());
        }}
        className="h-4 w-4 accent-white"
      />
      Compter mes visites dans les statistiques (dans ce navigateur)
    </label>
  );
}
