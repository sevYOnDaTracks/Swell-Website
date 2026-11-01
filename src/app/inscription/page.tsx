"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/auth/AuthShell";
import { authClient, authErrorMessage, nextPath } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));

    if (password !== form.get("confirm")) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      password,
    });
    setPending(false);

    if (error) return setError(authErrorMessage(error));
    router.push(nextPath("/compte"));
    router.refresh();
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Réserve tes sessions et retrouve tes achats."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-medium text-foreground underline-offset-4 hover:underline hover:text-white">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nom d'artiste ou nom" name="name" required autoComplete="name" placeholder="Sevy" />
        <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="toi@exemple.com" />
        <Field label="Mot de passe" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="8 caractères minimum" />
        <Field label="Confirmer le mot de passe" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        <FormError message={error} />
        <SubmitButton pending={pending}>Créer mon compte</SubmitButton>
      </form>
    </AuthShell>
  );
}
