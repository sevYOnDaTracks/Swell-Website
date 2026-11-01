import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient()],
});

const ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email ou mot de passe incorrect.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cet email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cet email.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit faire au moins 8 caractères.",
  INVALID_EMAIL: "Adresse email invalide.",
  BANNED_USER: "Ce compte a été suspendu.",
};

/** Page à ouvrir après connexion (?next=...), limitée aux chemins internes. */
export function nextPath(fallback: string) {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function authErrorMessage(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  return (error.code && ERRORS[error.code]) || "Une erreur est survenue, réessaie.";
}
