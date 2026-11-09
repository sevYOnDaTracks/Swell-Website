import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { listHref, PAGE_SIZE, type ListParams } from "@/lib/admin-list";

const field =
  "rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none [color-scheme:dark] focus:border-white/50";

type Filter = { name: string; label: string; options: { value: string; label: string }[] };

/** Barre de recherche et filtres d'une liste de l'admin (formulaire GET : marche sans JavaScript). */
export function ListSearch({
  basePath,
  params,
  placeholder,
  filters = [],
}: {
  basePath: string;
  params: ListParams;
  placeholder: string;
  filters?: Filter[];
}) {
  const active = ["q", ...filters.map((f) => f.name)].some((k) => typeof params[k] === "string" && params[k]);
  return (
    <form action={basePath} method="get" className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Rechercher</span>
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={typeof params.q === "string" ? params.q : ""} placeholder={placeholder} className={`${field} w-full pl-9`} />
      </label>
      {filters.map((f) => (
        <label key={f.name}>
          <span className="sr-only">{f.label}</span>
          <select name={f.name} defaultValue={typeof params[f.name] === "string" ? (params[f.name] as string) : ""} className={`${field} w-full sm:w-auto`}>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <div className="flex gap-2">
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200">Rechercher</button>
        {active && (
          <Link href={basePath} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted hover:text-foreground">
            <X size={14} /> Effacer
          </Link>
        )}
      </div>
    </form>
  );
}

/** « 21–40 sur 57 » et pages précédente / suivante, en gardant la recherche et les filtres. */
export function Pagination({ basePath, params, page, total }: { basePath: string; params: ListParams; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total === 0) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const around = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  const link = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm transition-colors";

  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-sm">
      <p className="text-muted">
        {from}–{to} sur {total}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={listHref(basePath, params, { page: page - 1 })} aria-label="Page précédente" className={`${link} border-white/10 hover:bg-white/5`}>
              <ChevronLeft size={16} />
            </Link>
          ) : (
            <span className={`${link} border-white/5 text-muted/40`} aria-hidden>
              <ChevronLeft size={16} />
            </span>
          )}
          {around.map((p, i) => (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && p - around[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
              <Link
                href={listHref(basePath, params, { page: p })}
                aria-current={p === page ? "page" : undefined}
                className={`${link} ${p === page ? "border-white bg-white text-black" : "border-white/10 hover:bg-white/5"}`}
              >
                {p}
              </Link>
            </span>
          ))}
          {page < pages ? (
            <Link href={listHref(basePath, params, { page: page + 1 })} aria-label="Page suivante" className={`${link} border-white/10 hover:bg-white/5`}>
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className={`${link} border-white/5 text-muted/40`} aria-hidden>
              <ChevronRight size={16} />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
