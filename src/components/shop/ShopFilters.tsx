"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import type { ProductType } from "@/db/schema";
import { priceOptions, productTypeLabels, sortOptions } from "@/lib/shop-format";

type Filters = { q?: string; type?: string; genre?: string; max?: number; sort?: string };

const select =
  "min-w-0 flex-1 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-white/50 [color-scheme:dark]";

export function ShopFilters({ filters, types, genres }: { filters: Filters; types: ProductType[]; genres: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");
  const firstRender = useRef(true);

  function update(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const next = { q: filters.q, type: filters.type, genre: filters.genre, max: filters.max?.toString(), sort: filters.sort, ...changes };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "sort" && v === "recent")) params.set(k, v);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  // Recherche appliquée 300 ms après la dernière frappe.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() || undefined }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seule la saisie déclenche la recherche
  }, [q]);

  const hasFilters = Boolean(filters.q || filters.type || filters.genre || filters.max !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un kit, un VST, un genre…"
            aria-label="Rechercher"
            className="w-full rounded-lg border border-white/10 bg-surface py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-white/50"
          />
        </label>
        <div className="flex gap-2 sm:flex-none">
          {genres.length > 0 && (
            <select aria-label="Genre" value={filters.genre ?? ""} onChange={(e) => update({ genre: e.target.value || undefined })} className={select}>
              <option value="">Genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
          <select aria-label="Prix" value={filters.max?.toString() ?? ""} onChange={(e) => update({ max: e.target.value || undefined })} className={select}>
            {priceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select aria-label="Trier" value={filters.sort ?? "recent"} onChange={(e) => update({ sort: e.target.value })} className={select}>
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Pill active={!filters.type} onClick={() => update({ type: undefined })}>
          Tout
        </Pill>
        {types.map((t) => (
          <Pill key={t} active={filters.type === t} onClick={() => update({ type: t })}>
            {productTypeLabels[t]}
          </Pill>
        ))}
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
            className="ml-auto inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <X size={14} /> Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active ? "border-white bg-white text-black" : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
