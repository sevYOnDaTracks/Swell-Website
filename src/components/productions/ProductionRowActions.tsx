"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { deleteProduction, moveProduction, setProductionPublished } from "@/app/actions/productions";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-30";

export function ProductionRowActions({
  id,
  published,
  isFirst,
  isLast,
}: {
  id: string;
  published: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" disabled={pending || isFirst} onClick={() => start(() => moveProduction(id, -1))} className={iconButton} aria-label="Monter">
        <ChevronUp size={15} />
      </button>
      <button type="button" disabled={pending || isLast} onClick={() => start(() => moveProduction(id, 1))} className={iconButton} aria-label="Descendre">
        <ChevronDown size={15} />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setProductionPublished(id, !published))}
        className={iconButton}
        aria-label={published ? "Masquer de l'accueil" : "Afficher sur l'accueil"}
        title={published ? "Masquer de l'accueil" : "Afficher sur l'accueil"}
      >
        {published ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <Link href={`/admin/productions/${id}`} className={iconButton} aria-label="Modifier" title="Modifier">
        <Pencil size={15} />
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Supprimer cette production ?")) start(() => deleteProduction(id));
        }}
        className={iconButton}
        aria-label="Supprimer"
        title="Supprimer"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
