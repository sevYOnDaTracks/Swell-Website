"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { unsubscribe } from "@/app/actions/marketing";

/** Confirme la désinscription des emails de nouveautés et de promos. */
export function UnsubscribeButton({ userId, token }: { userId: string; token: string }) {
  const [state, setState] = useState<"idle" | "done" | string>("idle");
  const [pending, start] = useTransition();

  if (state === "done") {
    return (
      <div>
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 size={18} /> C&apos;est fait : tu ne recevras plus nos emails de nouveautés et de promos.
        </p>
        <p className="mt-2 text-sm text-muted">
          Tu continueras à recevoir les emails liés à tes commandes, à tes licences et au support. Tu peux changer d&apos;avis dans{" "}
          <Link href="/compte/profil" className="text-foreground underline underline-offset-4">
            ton profil
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await unsubscribe(userId, token);
            setState("error" in result ? result.error : "done");
          })
        }
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {pending && <Loader2 size={16} className="animate-spin" />} Me désinscrire
      </button>
      {state !== "idle" && <p className="mt-3 text-sm text-red-400">{state}</p>}
    </div>
  );
}
