import { Mic, Music, Plug, SlidersHorizontal } from "lucide-react";
import { services, steps } from "@/lib/content";
import { SectionHeading } from "./SectionHeading";

const ICONS = { sliders: SlidersHorizontal, music: Music, mic: Mic, plug: Plug };

export function Services() {
  return (
    <section id="services" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Services"
          title="Tout ce qu'il faut pour sortir ton son"
          description="Du premier beat au master final, en studio ou à distance."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => {
            const Icon = ICONS[s.icon];
            return (
              <article
                key={s.title}
                className="group rounded-2xl border border-white/5 bg-surface p-6 transition-colors hover:border-white/25"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-foreground transition-colors group-hover:bg-white/10">
                  <Icon size={20} />
                </span>
                <h3 className="mt-5 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
              </article>
            );
          })}
        </div>

        <ol className="mt-16 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 font-mono text-sm text-accent">
                {i + 1}
              </span>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
