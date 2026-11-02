"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { deleteProduct, setProductPublished } from "@/app/actions/products";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40";

export function ProductRowActions({ id, slug, published }: { id: string; slug: string; published: boolean }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setProductPublished(id, !published))}
        className={iconButton}
        title={published ? "Repasser en brouillon" : "Publier"}
        aria-label={published ? "Repasser en brouillon" : "Publier"}
      >
        {published ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <Link href={`/admin/produits/${id}`} className={iconButton} title="Modifier" aria-label="Modifier">
        <Pencil size={15} />
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Supprimer ce produit définitivement ?")) start(() => deleteProduct(id));
        }}
        className={iconButton}
        title="Supprimer"
        aria-label="Supprimer"
      >
        <Trash2 size={15} />
      </button>
      {published && (
        <Link href={`/boutique/${slug}`} className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
          Voir
        </Link>
      )}
    </div>
  );
}
