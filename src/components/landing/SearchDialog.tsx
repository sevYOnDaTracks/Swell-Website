"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft, Loader2, Piano, Search, X } from "lucide-react";
import { getSearchCatalog, type SearchItem } from "@/app/actions/search";
import { formatPrice, mediaUrl, productPath, productTypeLabels } from "@/lib/shop-format";
import type { ProductType } from "@/db/schema";
import type { Site } from "@/lib/sites";

// Catalogue chargé une fois par page, à la première ouverture.
const cache: Partial<Record<Site, Promise<SearchItem[]>>> = {};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Loupe de la barre du haut : ouvre la recherche (aussi avec ⌘K, Ctrl+K ou /). */
export function SearchButton({ site, compact = false }: { site: Site; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Raccourcis sur la version ordinateur seulement (la barre mobile a aussi sa loupe).
    if (compact) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact]);

  return (
    <>
      {compact ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="Rechercher" className="rounded-md p-2 text-muted hover:text-foreground">
          <Search size={21} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Rechercher"
          className="flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-white/10 hover:text-foreground lg:w-60 lg:border lg:border-white/10 lg:bg-white/[0.04] lg:px-3 lg:hover:border-white/25 lg:hover:bg-white/[0.04]"
        >
          <Search size={17} className="shrink-0" />
          <span className="hidden flex-1 text-left lg:inline">{site === "mix" ? "Rechercher une prod" : "Rechercher un plugin"}</span>
          <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 font-sans text-[11px] lg:inline">⌘K</kbd>
        </button>
      )}
      {open && <SearchPanel site={site} onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchPanel({ site, onClose }: { site: Site; onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listHref = site === "mix" ? "/instrumentales" : "/boutique";

  useEffect(() => {
    input.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let alive = true;
    (cache[site] ??= getSearchCatalog(site)).then((list) => alive && setItems(list));
    return () => {
      alive = false;
      document.body.style.overflow = previous;
    };
  }, [site]);

  const results = useMemo(() => {
    if (!items) return [];
    const q = normalize(query.trim());
    if (!q) return items.slice(0, 6);
    const words = q.split(/\s+/);
    return items
      .map((p) => {
        const name = normalize(p.name);
        const hay = normalize(`${p.name} ${p.shortDescription} ${p.genres.join(" ")} ${productTypeLabels[p.type as ProductType] ?? ""}`);
        if (!words.every((w) => hay.includes(w))) return null;
        // Les noms qui commencent par la recherche d'abord, puis ceux qui la contiennent, puis la description.
        const score = name.replace(/^swell\s+/, "").startsWith(q) ? 0 : name.includes(q) ? 1 : 2;
        return { p, score };
      })
      .filter((r) => r !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((r) => r.p);
  }, [items, query]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  const seeAll = () => go(query.trim() ? `${listHref}?q=${encodeURIComponent(query.trim())}` : listHref);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = results[active];
      if (p) go(productPath(p));
      else seeAll();
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search size={20} className="shrink-0 text-muted" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={site === "mix" ? "Une prod, un style, une tonalité…" : "Un plugin, un effet, un instrument…"}
            aria-label="Rechercher"
            className="h-14 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
          />
          <button type="button" onClick={onClose} aria-label="Fermer la recherche" className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {items === null ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" /> Chargement
            </p>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Rien ne correspond à « {query.trim()} ».</p>
          ) : (
            <>
              {!query.trim() && <p className="px-3 pt-2 pb-1 text-xs text-muted">Nouveautés</p>}
              <ul>
                {results.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(productPath(p))}
                      className={`flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors ${active === i ? "bg-white/[0.08]" : ""}`}
                    >
                      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                        {p.coverFile ? (
                          <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="48px" unoptimized className="object-cover" />
                        ) : (
                          <Piano size={18} className="absolute inset-0 m-auto text-white/50" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-sm text-muted">
                          {productTypeLabels[p.type as ProductType] ?? p.type}
                          {p.shortDescription ? ` · ${p.shortDescription}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm tabular-nums">
                        <span className="block font-semibold">{formatPrice(p.priceCents)}</span>
                        {p.compareAtCents && <s className="block text-xs text-muted">{formatPrice(p.compareAtCents)}</s>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <button
          type="button"
          onMouseEnter={() => setActive(results.length)}
          onClick={seeAll}
          className={`flex w-full items-center justify-between border-t border-white/10 px-5 py-3.5 text-sm transition-colors ${active === results.length ? "bg-white/[0.06]" : ""}`}
        >
          <span className="flex items-center gap-2">
            {query.trim() ? `Voir tous les résultats pour « ${query.trim()} »` : site === "mix" ? "Toutes les instrumentales" : "Toute la boutique"}
            <ArrowRight size={15} />
          </span>
          <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
            <CornerDownLeft size={13} /> pour ouvrir · Échap pour fermer
          </span>
        </button>
      </div>
    </div>
  );
}
