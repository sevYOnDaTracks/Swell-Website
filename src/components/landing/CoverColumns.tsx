import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

export type CoverItem = { key: string; title: string; subtitle: string; cover: string | null; href: string; external?: boolean };

const COLUMNS = [
  { duration: "46s", down: false, offset: "mt-24" },
  { duration: "38s", down: true, offset: "mt-0" },
  { duration: "52s", down: false, offset: "mt-12" },
];

function Card({ item }: { item: CoverItem }) {
  const content = (
    <>
      {item.cover ? (
        <Image src={item.cover} alt="" fill sizes="(min-width: 1024px) 15vw, 40vw" unoptimized className="object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-white/10 via-surface-2 to-white/[0.02]" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-8 pb-3">
        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
        <p className="truncate text-xs text-white/70">{item.subtitle}</p>
      </div>
    </>
  );
  const className =
    "relative block aspect-square overflow-hidden rounded-xl border border-white/10 bg-surface transition-colors hover:border-white/40";

  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} tabIndex={-1}>
      {content}
    </a>
  ) : (
    <Link href={item.href} className={className} tabIndex={-1}>
      {content}
    </Link>
  );
}

/** Trois colonnes de pochettes qui défilent en continu (en pause au survol). */
export function CoverColumns({ items }: { items: CoverItem[] }) {
  if (items.length === 0) return null;
  // Au moins 4 pochettes par colonne pour que le défilement ne laisse pas de trou.
  const pool = Array.from({ length: Math.max(12, items.length) }, (_, i) => items[i % items.length]);
  const columns = COLUMNS.map((_, c) => pool.filter((_, i) => i % COLUMNS.length === c));

  return (
    <div aria-hidden className="covers-fade grid h-full grid-cols-3 gap-4 overflow-hidden">
      {COLUMNS.map((col, c) => (
        <div key={c} className="covers-column">
          <div
            className={`covers-scroll flex flex-col gap-4 ${col.offset} ${col.down ? "covers-down" : ""}`}
            style={{ "--covers-duration": col.duration } as CSSProperties}
          >
            {[...columns[c], ...columns[c]].map((item, i) => (
              <Card key={`${item.key}-${i}`} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
