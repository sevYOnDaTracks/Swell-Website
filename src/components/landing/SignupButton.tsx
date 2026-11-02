"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

/** Bouton Inscription de l'accueil, masqué quand le visiteur est déjà connecté. */
export function SignupButton({ className }: { className: string }) {
  const { data: session } = authClient.useSession();
  if (session) return null;

  return (
    <Link href="/inscription" className={className}>
      Inscription
    </Link>
  );
}
