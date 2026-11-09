"use client";

import Link from "next/link";
import { useState } from "react";
import { AudioLines, CircleHelp, Disc3, Gauge, LogIn, Menu, Plug, SlidersHorizontal, Tags, UserRound, X } from "lucide-react";
import { CartLink } from "@/components/cart/CartLink";
import { authClient } from "@/lib/auth-client";
import { navLinksBySite } from "@/lib/content";
import type { Site } from "@/lib/sites";
import { Logo } from "./Logo";

const ICONS: Record<string, typeof Disc3> = {
  "/#productions": Disc3,
  "/#services": SlidersHorizontal,
  "/instrumentales": AudioLines,
  "/boutique": Plug,
  "/#tarifs": Tags,
  "/#faq": CircleHelp,
};

/** Bouton icône avec info-bulle au survol (et au focus clavier). */
function IconLink({
  href,
  label,
  Icon,
  primary,
}: {
  href: string;
  label: string;
  Icon: typeof Disc3;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        primary ? "bg-primary text-black hover:bg-neutral-200" : "text-muted hover:bg-white/10 hover:text-foreground"
      }`}
    >
      <Icon size={19} />
      <span className="pointer-events-none absolute top-full z-50 mt-2 hidden whitespace-nowrap rounded-md border border-white/10 bg-surface-2 px-2 py-1 text-xs text-foreground shadow-lg group-hover:block group-focus-visible:block">
        {label}
      </span>
    </Link>
  );
}

export function Navbar({ site = "shop" }: { site?: Site }) {
  const navLinks = navLinksBySite[site];
  const [open, setOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const account = session
    ? role === "admin"
      ? { href: "/admin", label: "Admin", Icon: Gauge }
      : { href: "/compte", label: "Mon espace", Icon: UserRound }
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <IconLink href={link.href} label={link.label} Icon={ICONS[link.href] ?? CircleHelp} />
            </li>
          ))}
        </ul>

        <div className={`hidden items-center gap-2 transition-opacity md:flex ${isPending ? "opacity-0" : ""}`}>
          <CartLink />
          {account ? (
            <IconLink href={account.href} label={account.label} Icon={account.Icon} primary />
          ) : (
            <>
              <IconLink href="/connexion" label="Connexion" Icon={LogIn} />
              <Link
                href="/inscription"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <CartLink onClick={() => setOpen(false)} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-muted hover:text-foreground md:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/5 px-4 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = ICONS[link.href] ?? CircleHelp;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-2 py-3 text-muted hover:bg-white/5 hover:text-foreground"
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            {account ? (
              <Link
                href={account.href}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-black"
              >
                <account.Icon size={16} />
                {account.label}
              </Link>
            ) : (
              <>
                <Link
                  href="/connexion"
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm"
                >
                  <LogIn size={16} />
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
