"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/auth/AuthShell";
import { authClient, authErrorMessage } from "@/lib/auth-client";

const noopSubscribe = () => () => {};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Le lien de l'email arrive ici avec ?token=... (ou ?error=INVALID_TOKEN s'il a expiré).
  const params = useSyncExternalStore(
    noopSubscribe,
    () => window.location.search,
    () => "",
  );
  const search = new URLSearchParams(params);
  const token = search.get("token");
  const invalid = search.get("error") === "INVALID_TOKEN";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== form.get("confirm")) return setError("Les mots de passe ne correspondent pas.");
    if (!token) return;

    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) {
      return setError(error.code === "INVALID_TOKEN" ? "Ce lien a expiré : redemande un nouveau lien." : authErrorMessage(error));
    }
    router.push("/connexion?reinitialise=1");
  }

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisis un mot de passe d'au moins 8 caractères."
      footer={
        <Link href="/connexion" className="font-medium text-foreground underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      {invalid || (params && !token) ? (
        <div className="space-y-4">
          <FormError message="Ce lien est invalide ou a expiré." />
          <Link href="/mot-de-passe-oublie" className="block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-black">
            Recevoir un nouveau lien
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nouveau mot de passe" name="password" type="password" required minLength={8} autoComplete="new-password" />
          <Field label="Confirmer" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          <FormError message={error} />
          <SubmitButton pending={pending}>Enregistrer</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
