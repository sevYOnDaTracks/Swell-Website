"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { claimFreeProduct } from "@/app/actions/orders";

/** Téléchargement d'un produit gratuit : sans compte, on passe d'abord par l'inscription. */
export function FreeDownloadButton({ productId, slug }: { productId: string; slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onClick() {
    setError(null);
    start(async () => {
      const result = await claimFreeProduct(productId);
      if ("needsAccount" in result) {
        router.push(`/inscription?next=${encodeURIComponent(`/boutique/${slug}`)}`);
        return;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // Un lien de téléchargement ne quitte pas la page ; router.push ne sait pas ouvrir une route d'API.
      const link = document.createElement("a");
      link.href = `/api/downloads/${productId}`;
      link.download = "";
      link.click();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Télécharger gratuitement
      </button>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
