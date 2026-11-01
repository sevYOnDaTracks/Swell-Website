import { ArrowRight, CalendarCheck } from "lucide-react";
import { daws } from "@/lib/content";

// Hauteurs pseudo-aléatoires mais fixes pour éviter un mismatch serveur/client.
const BARS = Array.from({ length: 48 }, (_, i) => 20 + Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 80));

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-white/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute top-40 right-0 h-[300px] w-[400px] rounded-full bg-white/[0.04] blur-[120px]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Sessions ouvertes · réservation en ligne
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Ton son, <span className="text-gradient">au niveau pro.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted sm:text-lg">
          Mixing, prod, prise de voix à distance et sons pour beatmakers. Réserve ta session en quelques clics.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/reserver"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-black shadow-lg shadow-white/10 transition-colors hover:bg-neutral-200 sm:w-auto"
          >
            <CalendarCheck size={18} />
            Réserver une session
          </a>
          <a
            href="#boutique"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 font-medium transition-colors hover:bg-white/10 sm:w-auto"
          >
            Boutique
            <ArrowRight size={18} />
          </a>
        </div>

        <div
          aria-hidden
          className="mx-auto mt-16 flex h-28 max-w-3xl items-center justify-center gap-[3px] overflow-hidden rounded-2xl border border-white/5 bg-surface/60 px-4 py-5 sm:gap-1"
        >
          {BARS.map((h, i) => (
            <span
              key={i}
              className="wave-bar w-1 rounded-full bg-gradient-to-t from-neutral-600 to-white sm:w-1.5"
              style={{ height: `${h}%`, animationDelay: `${(i % 12) * 0.1}s` }}
            />
          ))}
        </div>

        <div className="mt-12">
          <p className="text-xs uppercase tracking-widest text-muted/70">Je travaille sur</p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted">
            {daws.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
