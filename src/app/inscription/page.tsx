"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { authClient, authErrorMessage, nextPath } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const booking = useBookingIntent();

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
      title={booking ? "Crée ton compte pour réserver" : "Créer un compte"}
      subtitle={booking ? "30 secondes, puis tu choisis ton créneau." : "Réserve tes sessions et retrouve tes achats."}
      footer={
        <>
          Déjà un compte ?{" "}
          <Link
            href="/connexion"
            onClick={(e) => {
              e.preventDefault();
              router.push(`/connexion${window.location.search}`);
            }}
            className="font-medium text-foreground underline-offset-4 hover:underline hover:text-white">
            Se connecter
          </Link>
        </>
      }
    >
      <GoogleButton label="S'inscrire avec Google" />
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <Field label="Nom d'artiste ou nom" name="name" required autoComplete="name" placeholder="Sevy" />
        <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="toi@exemple.com" />
        <Field label="Mot de passe" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="8 caractères minimum" />
        <Field label="Confirmer le mot de passe" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        <FormError message={error} />
        <SubmitButton pending={pending}>Créer mon compte</SubmitButton>
        <p className="text-center text-xs leading-relaxed text-muted">
          En créant un compte, tu acceptes les{" "}
          <Link href="/cgv" className="underline underline-offset-2 hover:text-foreground">
            CGV
          </Link>{" "}
          et la{" "}
          <Link href="/confidentialite" className="underline underline-offset-2 hover:text-foreground">
            politique de confidentialité
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}

const noopSubscribe = () => () => {};

/** Vrai quand le visiteur arrive ici en voulant réserver (?next=/reserver...). */
function useBookingIntent() {
  return useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("next")?.startsWith("/reserver") ?? false,
    () => false,
  );
}
