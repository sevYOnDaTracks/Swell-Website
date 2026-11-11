"use client";

import { Landmark } from "lucide-react";
import { formatFcfa, METHOD_LABELS, type PayMethod } from "@/lib/payments";

// Pastilles aux couleurs de chaque moyen de paiement (texte, sans logo officiel).
function Badge({ method }: { method: PayMethod }) {
  if (method === "paypal")
    return <span className="rounded-md bg-white px-2 py-1 text-[13px] font-extrabold italic tracking-tight text-[#003087]">Pay<span className="text-[#009cde]">Pal</span></span>;
  if (method === "wero")
    return <span className="rounded-md bg-[#fff48d] px-2 py-1 text-[13px] font-extrabold tracking-tight text-black">wero</span>;
  if (method === "wave") return <span className="rounded-md bg-[#1dc8f2] px-2 py-1 text-[13px] font-extrabold tracking-tight text-[#0b2a5b]">wave</span>;
  if (method === "orange_money")
    return (
      <span className="flex items-center gap-1.5">
        <span className="h-5 w-5 rounded-[4px] bg-[#ff7900]" aria-hidden />
        <span className="text-[13px] font-bold">Orange Money</span>
      </span>
    );
  return <Landmark size={20} />;
}

const HINTS: Record<PayMethod, string> = {
  paypal: "Compte PayPal ou carte",
  wero: "Depuis l'app de ta banque",
  transfer: "Virement bancaire (IBAN)",
  wave: "Mobile money · Côte d'Ivoire",
  orange_money: "Mobile money · Côte d'Ivoire",
};

/** Choix du moyen de paiement, en cartes côte à côte. */
export function PaymentMethodPicker({
  methods,
  value,
  onChange,
  totalCents,
  legend = "Payer avec",
}: {
  methods: PayMethod[];
  value: PayMethod | null;
  onChange: (m: PayMethod) => void;
  totalCents: number;
  legend?: string;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-medium">{legend}</legend>
      <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2">
        {methods.map((m) => {
          const selected = value === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={METHOD_LABELS[m]}
              onClick={() => onChange(m)}
              className={`relative flex min-h-[84px] flex-col items-start justify-between gap-2 rounded-xl border p-3 text-left transition-colors ${
                selected ? "border-white bg-white/10" : "border-white/10 bg-background/40 hover:border-white/30"
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-3 right-3 flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-white" : "border-white/30"}`}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              <Badge method={m} />
              <span className="text-xs text-muted">{m === "wave" || m === "orange_money" ? formatFcfa(totalCents) : HINTS[m]}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
