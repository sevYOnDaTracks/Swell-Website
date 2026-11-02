"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/auth/AuthShell";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reinitialiser" });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    setSentTo(email);
  }

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="On t'envoie un lien pour en choisir un nouveau."
      footer={
        <Link href="/connexion" className="font-medium text-foreground underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      {sentTo ? (
        <p className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-3 text-sm leading-relaxed">
          Si un compte existe pour <strong>{sentTo}</strong>, un email vient de partir avec un lien valable 1 heure. Pense à
          regarder tes spams.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="toi@exemple.com" />
          <FormError message={error} />
          <SubmitButton pending={pending}>Envoyer le lien</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
