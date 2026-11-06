"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const OPEN_EVENT = "swell:verifier-email";
const seenKey = (sessionId: string) => `swell-verification-vue-${sessionId}`;

/** Rouvre la fenêtre, par exemple quand le client essaie de payer sans avoir confirmé son adresse. */
export function askEmailVerification() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function alreadySeen(sessionId: string) {
  try {
    return localStorage.getItem(seenKey(sessionId)) !== null;
  } catch {
    return false;
  }
}

/** Fenêtre affichée à chaque connexion tant que l'adresse email n'est pas confirmée. */
export function EmailVerificationPrompt() {
  const { data } = authClient.useSession();
  const [forced, setForced] = useState(false);
  const [closedSession, setClosedSession] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const open = () => setForced(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const user = data?.user;
  const sessionId = data?.session.id;
  if (!user || !sessionId || user.emailVerified || user.role === "admin") return null;
  if (!forced && (closedSession === sessionId || alreadySeen(sessionId))) return null;

  function close() {
    setForced(false);
    setClosedSession(sessionId!);
    try {
      localStorage.setItem(seenKey(sessionId!), "1");
    } catch {
      // Stockage indisponible : la fenêtre reste fermée jusqu'au prochain chargement.
    }
  }

  async function resend() {
    setSending(true);
    setFailed(false);
    const { error } = await authClient.sendVerificationEmail({ email: user!.email, callbackURL: "/compte" });
    setSending(false);
    if (error) setFailed(true);
    else setSent(true);
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="verification-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl">
        <MailCheck size={26} />
        <h2 id="verification-title" className="mt-4 text-xl font-bold tracking-tight">
          Confirme ton adresse email
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">
          Clique sur le lien envoyé à <span className="font-medium break-all">{user.email}</span>. Sans ça, tu ne peux ni commander, ni télécharger, ni réserver de session.
        </p>
        {sent && <p className="mt-3 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm">Email renvoyé. Regarde aussi dans tes spams.</p>}
        {failed && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            L&apos;envoi a échoué, réessaie dans un instant.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={resend}
            disabled={sending}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            {sending ? "Envoi…" : "Renvoyer l'email"}
          </button>
          <button type="button" onClick={close} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm transition-colors hover:bg-white/5">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
