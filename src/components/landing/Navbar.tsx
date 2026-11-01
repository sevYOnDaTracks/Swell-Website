"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { navLinks } from "@/lib/content";
import { Logo } from "./Logo";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const account = session
    ? { href: role === "admin" ? "/admin" : "/compte", label: role === "admin" ? "Admin" : "Mon espace" }
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <ul className="hidden items-center gap-8 text-sm text-muted md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={`hidden items-center gap-3 transition-opacity md:flex ${isPending ? "opacity-0" : ""}`}>
          {account ? (
            <Link
              href={account.href}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
            >
              {account.label}
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="px-3 py-2 text-sm text-muted transition-colors hover:text-foreground">
                Connexion
              </Link>
              <Link
                href="/inscription"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-muted hover:text-foreground md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/5 px-4 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-3 text-muted hover:bg-white/5 hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {account ? (
              <Link href={account.href} className="rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-black">
                {account.label}
              </Link>
            ) : (
              <>
                <Link href="/connexion" className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm">
                  Connexion
                </Link>
                <Link href="/inscription" className="rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-black">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
