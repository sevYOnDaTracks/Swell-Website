import { ExternalLink } from "lucide-react";

/** Lien externe d'un produit (gros fichier hébergé ailleurs), montré aux acheteurs à côté du téléchargement. */
export function ExternalLinkButton({ url, label }: { url: string | null | undefined; label: string | null | undefined }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10"
    >
      {label || "Télécharger"} <ExternalLink size={14} />
    </a>
  );
}
