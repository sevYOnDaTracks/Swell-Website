import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/landing/Logo";
import { SignOutButton } from "./SignOutButton";

type User = { name: string; email: string; role: string };

export function DashboardShell({
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

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-white/5 bg-surface/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden gap-1 text-sm sm:flex">
              <NavLinks isAdmin={isAdmin} />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 text-sm sm:hidden">
          <NavLinks isAdmin={isAdmin} />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  return (
    <>
      <NavLink href="/compte">Mon espace</NavLink>
      <NavLink href="/reserver">Réserver</NavLink>
      {isAdmin && <NavLink href="/admin">Admin</NavLink>}
      {isAdmin && <NavLink href="/admin/disponibilites">Disponibilités</NavLink>}
      {isAdmin && <NavLink href="/admin/produits">Boutique</NavLink>}
    </>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-muted transition-colors hover:bg-white/5 hover:text-foreground">
      {children}
    </Link>
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
