import Link from "next/link";
import { navLinks } from "@/lib/content";
import { Logo } from "./Logo";

export function CallToAction() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-surface px-6 py-16 text-center">
        <div className="pointer-events-none absolute -bottom-32 left-1/2 h-64 w-[700px] -translate-x-1/2 rounded-full bg-white/[0.08] blur-[100px]" />
        <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
          Prêt à passer au <span className="text-gradient">niveau supérieur</span> ?
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-muted">
          Crée ton compte gratuitement et réserve ta première session.
        </p>
        <Link
          href="/inscription"
          className="relative mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-black transition-colors hover:bg-neutral-200"
        >
          Créer mon compte
        </Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <Logo />
        <ul className="flex flex-wrap justify-center gap-6 text-sm text-muted">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">© 2026 Swell</p>
      </div>
    </footer>
  );
}
