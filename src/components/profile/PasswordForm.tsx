"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { input } from "./ProfileForm";

const ERRORS: Record<string, string> = {
  INVALID_PASSWORD: "Mot de passe actuel incorrect.",
  PASSWORD_TOO_SHORT: "Le nouveau mot de passe doit faire au moins 8 caractères.",
};

export function PasswordForm() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword"));
    if (newPassword !== data.get("confirm")) return setMessage({ ok: false, text: "Les deux mots de passe ne correspondent pas." });

    setMessage(null);
    start(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: String(data.get("currentPassword")),
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) return setMessage({ ok: false, text: (error.code && ERRORS[error.code]) || "Une erreur est survenue, réessaie." });
      form.reset();
      setMessage({ ok: true, text: "Mot de passe modifié. Tes autres appareils ont été déconnectés." });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Mot de passe actuel</span>
        <input name="currentPassword" type="password" required autoComplete="current-password" className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Nouveau mot de passe</span>
          <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Confirmation</span>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          Changer le mot de passe
        </button>
        {message && (
          <p role="status" className={`flex items-center gap-1.5 text-sm ${message.ok ? "text-foreground" : "text-red-300"}`}>
            {message.ok && <CheckCircle2 size={16} />}
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
