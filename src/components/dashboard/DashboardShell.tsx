import type { ReactNode } from "react";
import Link from "next/link";
import { AudioLines, House, ShoppingBag } from "lucide-react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartLink } from "@/components/cart/CartLink";
import { Logo } from "@/components/landing/Logo";
import { currentSite } from "@/lib/site-server";
import type { Site } from "@/lib/sites";
import { Avatar } from "./Avatar";
import { DashboardNav } from "./DashboardNav";
import { SignOutButton } from "./SignOutButton";

type User = { name: string; email: string; image?: string | null; role: string };

// Liens vers le site public, écrits en toutes lettres pour que le client retrouve toujours la boutique.
const PUBLIC_LINKS: Record<Site, { href: string; label: string; Icon: typeof ShoppingBag }[]> = {
  shop: [
    { href: "/", label: "Accueil", Icon: House },
    { href: "/boutique", label: "Boutique", Icon: ShoppingBag },
  ],
  mix: [
    { href: "/", label: "Accueil", Icon: House },
    { href: "/instrumentales", label: "Instrumentales", Icon: AudioLines },
  ],
};

export async function DashboardShell({
  user,
  title,
  subtitle,
  children,
}: {
  user: User;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const isAdmin = user.role === "admin";
  // Le menu suit le site : plugins sur swell-audio.fr, réservations sur mix.swell-audio.fr.
  const site = await currentSite();
  // Le lien principal vers le catalogue : la boutique de plugins, ou les instrumentales sur mix.
  const browseLink = PUBLIC_LINKS[site][1];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <CartDrawer browseHref={browseLink.href} />
      <header className="border-b border-white/5 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4 lg:gap-6">
            <Logo />
            <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
              {PUBLIC_LINKS[site].map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/10 hover:text-foreground"
                >
                  <Icon size={16} /> {label}
                </Link>
              ))}
            </nav>
            <span aria-hidden className="hidden h-5 w-px bg-white/15 md:block" />
            <nav aria-label="Espace" className="hidden md:block">
              <DashboardNav isAdmin={isAdmin} site={site} />
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <CartLink />
            <Link href="/compte/profil" aria-label="Mon profil" className="flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/5">
              <div className="hidden text-right lg:block">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-muted">{user.email}</p>
              </div>
              <Avatar name={user.name} image={user.image} size={34} />
            </Link>
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 md:hidden">
          <Link
            href={browseLink.href}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/10"
          >
            <browseLink.Icon size={16} /> {browseLink.label}
          </Link>
          <nav aria-label="Espace" className="min-w-0 overflow-x-auto">
            <DashboardNav isAdmin={isAdmin} site={site} />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 animate-pulse px-4 py-24 sm:px-6">
      <div className="h-8 w-64 rounded-lg bg-white/5" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
