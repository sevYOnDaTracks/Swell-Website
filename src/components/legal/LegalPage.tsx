import type { ReactNode } from "react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { isTodo, legal } from "@/lib/legal";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Dernière mise à jour : {legal.lastUpdate}</p>
        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-foreground/85">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/** Valeur légale, surlignée tant qu'elle n'est pas renseignée. */
export function V({ children }: { children: string }) {
  return isTodo(children) ? (
    <mark className="rounded bg-amber-300/90 px-1 text-black">[À compléter : {children.replace(/^TODO\s*/, "")}]</mark>
  ) : (
    <>{children}</>
  );
}
