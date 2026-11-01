"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Déconnexion</span>
    </button>
  );
}
