"use client";

import { useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { formatBytes } from "@/lib/shop-format";

export type Installers = { mac: number | null; win: number | null };

/** Système du visiteur, pour mettre son installateur en avant ("other" côté serveur ou mobile). */
export function detectOs(): "mac" | "win" | "other" {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "win";
  if (/Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) return "mac";
  return "other";
}

const subscribe = () => () => {};

const primary =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200";
const secondary =
  "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10";

/**
 * Boutons de téléchargement d'un plugin : un installateur Mac et un Windows quand ils existent
 * (celui du système du visiteur en premier), sinon le fichier unique.
 */
export function DownloadChoice({ productId, installers }: { productId: string; installers?: Installers | null }) {
  const os = useSyncExternalStore(subscribe, detectOs, () => "other" as const);
  const href = `/api/downloads/${productId}`;

  if (!installers || (installers.mac === null && installers.win === null)) {
    return (
      <a href={href} className={primary}>
        <Download size={15} /> Télécharger
      </a>
    );
  }

  const options = [
    { os: "mac" as const, label: "Mac", size: installers.mac },
    { os: "win" as const, label: "Windows", size: installers.win },
  ].filter((o) => o.size !== null);
  if (os === "win") options.reverse();

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {options.map((o, i) => (
        <a
          key={o.os}
          href={`${href}?os=${o.os}`}
          className={(os === "other" ? i === 0 : o.os === os) ? primary : secondary}
          title={o.size ? `Installateur ${o.label} · ${formatBytes(o.size)}` : `Installateur ${o.label}`}
        >
          <Download size={15} /> {o.label}
        </a>
      ))}
    </div>
  );
}
