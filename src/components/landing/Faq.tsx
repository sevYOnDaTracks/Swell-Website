import { Plus } from "lucide-react";
import { faq } from "@/lib/content";
import { SectionHeading } from "./SectionHeading";

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />

        <div className="mt-12 divide-y divide-white/5 rounded-2xl border border-white/5 bg-surface">
          {faq.map((item) => (
            <details key={item.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus size={18} className="shrink-0 text-muted transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
