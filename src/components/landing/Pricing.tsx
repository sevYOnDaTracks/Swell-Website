import Link from "next/link";
import { Check } from "lucide-react";
import { getPlans } from "@/lib/offers";
import { SectionHeading } from "./SectionHeading";

export async function Pricing() {
  const plans = (await getPlans()).filter((p) => p.visible);
  if (plans.length === 0) return null;

  return (
    <section id="tarifs" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Tarifs"
          title="Des prix clairs, sans surprise"
          description="Choisis ta formule, réserve ton créneau, on s'occupe du reste."
        />

        <div className={`mt-14 grid gap-4 ${plans.length === 1 ? "mx-auto max-w-md" : plans.length === 2 ? "mx-auto max-w-4xl md:grid-cols-2" : plans.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3"}`}>
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                plan.highlighted
                  ? "border-white/40 bg-gradient-to-b from-white/[0.06] to-surface shadow-xl shadow-black/40"
                  : "border-white/5 bg-surface"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-medium text-black">
                  Le plus demandé
                </span>
              )}
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted">{plan.unit}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.serviceId ? `/reserver?service=${plan.serviceId}` : "/reserver"}
                className={`mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-black hover:bg-neutral-200"
                    : "border border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                Réserver
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
