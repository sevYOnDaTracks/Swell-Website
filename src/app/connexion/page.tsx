"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { authClient, authErrorMessage, nextPath } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    setPending(true);
    setError(null);
    const { data, error } = await authClient.signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setPending(false);

    if (error) return setError(authErrorMessage(error));
    const role = (data?.user as { role?: string } | undefined)?.role;
    router.push(nextPath(role === "admin" ? "/admin" : "/compte"));
    router.refresh();
  }

  return (
    <AuthShell
      title="Connexion"
      subtitle="Content de te revoir."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            onClick={(e) => {
              e.preventDefault();
              router.push(`/inscription${window.location.search}`);
            }} className="font-medium text-foreground underline-offset-4 hover:underline hover:text-white">
            Créer un compte
          </Link>
        </>
      }
    >
      <GoogleButton label="Continuer avec Google" />
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="toi@exemple.com" />
        <Field label="Mot de passe" name="password" type="password" required autoComplete="current-password" />
        <FormError message={error} />
        <SubmitButton pending={pending}>Se connecter</SubmitButton>
      </form>
    </AuthShell>
  );
}
