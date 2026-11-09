"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { startTrial } from "@/app/actions/licenses";
import { askEmailVerification } from "@/components/auth/EmailVerificationPrompt";

/** Démo d'un VST : sans compte, on passe d'abord par l'inscription, puis l'essai part vers « Mon espace ». */
export function TrialButton({ productId, path, days }: { productId: string; path: string; days: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onClick() {
    setError(null);
    start(async () => {
      const result = await startTrial(productId);
      if ("needsAccount" in result) {
        router.push(`/inscription?next=${encodeURIComponent(path)}`);
        return;
      }
      if ("needsVerification" in result) {
        setError("Confirme d'abord ton adresse email pour lancer l'essai.");
        askEmailVerification();
        return;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/compte#achats");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10 disabled:opacity-50"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
        Essayer {days} jours gratuitement
      </button>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
