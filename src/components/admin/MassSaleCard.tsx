"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { ChevronDown, Loader2, Piano, Search, TicketPercent } from "lucide-react";
import { updateMassSale, type MassSaleInput } from "@/app/actions/sale";
import { formatPrice, massSalePrice, mediaUrl, productTypeLabels, type MassSale } from "@/lib/shop-format";
import type { ProductType } from "@/db/schema";

export type SaleProduct = {
  id: string;
  name: string;
  type: string;
  priceCents: number;
  coverFile: string | null;
  // Prix promo du produit encore valable (réglé sur sa fiche), sinon null.
  ownSaleCents: number | null;
};

const field =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-white/50";
const dateValue = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(iso)) : "");

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-white" : "bg-white/15"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${checked ? "left-[22px] bg-black" : "left-0.5 bg-white/70"}`} />
    </button>
  );
}

/** Promo de masse : une remise sur toute la boutique, des types ou une sélection, avec aperçu des prix. */
export function MassSaleCard({ sale, products, status }: { sale: MassSale; products: SaleProduct[]; status: { label: string; running: boolean } }) {
  const initial: MassSaleInput = {
    ...sale,
    value: sale.kind === "amount" ? (sale.value / 100).toString().replace(".", ",") : String(sale.value),
    startsAt: dateValue(sale.startsAt),
    endsAt: dateValue(sale.endsAt),
  };
  const [open, setOpen] = useState(sale.enabled);
  const [baseline, setBaseline] = useState(initial);
  const [d, setD] = useState(initial);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, start] = useTransition();
  const dirty = JSON.stringify(d) !== JSON.stringify(baseline);
  const set = <K extends keyof MassSaleInput>(k: K, v: MassSaleInput[K]) => setD((x) => ({ ...x, [k]: v }));
  const types = [...new Set(products.map((p) => p.type))] as ProductType[];

  // Aperçu calculé avec les mêmes règles que le site.
  const preview = useMemo(() => {
    const raw = Number(d.value.replace(",", "."));
    const rule: MassSale = {
      ...d,
      value: d.kind === "amount" ? Math.round(raw * 100) : raw,
      startsAt: null,
      endsAt: null,
    };
    if (!Number.isFinite(raw) || raw <= 0) return [];
    return products.flatMap((p) => {
      const cents = massSalePrice(rule, p);
      return cents === null ? [] : [{ p, cents, ownLower: p.ownSaleCents !== null && p.ownSaleCents <= cents }];
    });
  }, [d, products]);

  const list = products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const picking = d.scope === "products";
  const checked = (id: string) => (picking ? d.productIds.includes(id) : !d.excludeIds.includes(id));
  const toggle = (id: string, on: boolean) =>
    picking
      ? set("productIds", on ? [...d.productIds, id] : d.productIds.filter((x) => x !== id))
      : set("excludeIds", on ? d.excludeIds.filter((x) => x !== id) : [...d.excludeIds, id]);
  const inScope = (p: SaleProduct) => d.scope !== "types" || d.types.includes(p.type);

  function save() {
    setMessage(null);
    start(async () => {
      const result = await updateMassSale(d);
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      setBaseline(d);
      setMessage({ ok: true, text: "Enregistré. Les prix du site sont à jour." });
    });
  }

  return (
    <section className={`mb-4 overflow-hidden rounded-2xl border bg-surface ${status.running ? "border-white/40" : "border-white/10"}`}>
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <TicketPercent size={20} className="shrink-0" />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 font-semibold">
              Promo de masse
              <span className={`rounded-full px-2 py-0.5 text-xs font-normal ${status.running ? "bg-white text-black" : "bg-white/10 text-muted"}`}>{status.label}</span>
            </span>
            <span className="block text-sm text-muted">Une remise sur toute la boutique, des types de produits ou une sélection, entre deux dates.</span>
          </span>
          <ChevronDown size={18} className={`ml-auto shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-5 py-5">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="space-y-5">
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={d.enabled} onChange={(v) => set("enabled", v)} label="Activer la promo de masse" />
                <span className="font-medium">{d.enabled ? "Activée" : "Désactivée"}</span>
                <span className="text-muted">· elle s&apos;applique entre les dates choisies</span>
              </label>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="text-sm font-medium">Remise</p>
                  <div className="mt-1.5 flex gap-2">
                    <input value={d.value} onChange={(e) => set("value", e.target.value)} inputMode="decimal" aria-label="Valeur de la remise" className={`${field} mt-0 w-28 tabular-nums`} />
                    <div role="radiogroup" aria-label="Type de remise" className="inline-flex rounded-lg border border-white/10 p-0.5 text-sm">
                      {(["percent", "amount"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={d.kind === k}
                          onClick={() => set("kind", k)}
                          className={`rounded-md px-3 py-1.5 transition-colors ${d.kind === k ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
                        >
                          {k === "percent" ? "%" : "€"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <label className="block text-sm">
                  <span className="font-medium">Nom affiché (facultatif)</span>
                  <input value={d.label} onChange={(e) => set("label", e.target.value)} maxLength={30} placeholder="Black Friday" className={field} />
                </label>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={d.roundTo99} onChange={(e) => set("roundTo99", e.target.checked)} className="mt-0.5 h-4 w-4 accent-white" />
                <span>
                  Prix ronds (,49 ou ,99)
                  <span className="block text-xs text-muted">Arrondi juste en dessous, 50 centimes au plus : 12,99 € -30 % donne 8,99 € au lieu de 9,09 €.</span>
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">Début</span>
                  <input type="date" value={d.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={`${field} [color-scheme:dark]`} />
                  <span className="mt-1 block text-xs text-muted">Vide : tout de suite.</span>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Fin</span>
                  <input type="date" value={d.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={`${field} [color-scheme:dark]`} />
                  <span className="mt-1 block text-xs text-muted">Vide : jusqu&apos;à ce que tu la désactives.</span>
                </label>
              </div>

              <div>
                <p className="text-sm font-medium">Produits concernés</p>
                <div role="radiogroup" className="mt-1.5 inline-flex rounded-lg border border-white/10 p-0.5 text-sm">
                  {(
                    [
                      ["all", "Toute la boutique"],
                      ["types", "Par type"],
                      ["products", "Sélection"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={d.scope === k}
                      onClick={() => set("scope", k)}
                      className={`rounded-md px-3 py-1.5 transition-colors ${d.scope === k ? "bg-white text-black" : "text-muted hover:text-foreground"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {d.scope === "types" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {types.map((t) => {
                      const on = d.types.includes(t);
                      return (
                        <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? "border-white/50 bg-white/10" : "border-white/10"}`}>
                          <input type="checkbox" checked={on} onChange={(e) => set("types", e.target.checked ? [...d.types, t] : d.types.filter((x) => x !== t))} className="h-3.5 w-3.5 accent-white" />
                          {productTypeLabels[t] ?? t}
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="mt-3 text-xs text-muted">
                  {picking ? "Coche les produits en promo." : "Tous sont cochés : décoche ceux à exclure."} Les produits gratuits ne sont jamais concernés.
                </p>
                <label className="relative mt-2 block">
                  <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                  <span className="sr-only">Chercher un produit</span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un produit" className={`${field} mt-0 pl-9`} />
                </label>
                <div className="mt-2 grid max-h-[260px] gap-1 overflow-y-auto pr-1">
                  {list.filter(inScope).map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.04]">
                      <input type="checkbox" checked={checked(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} className="h-4 w-4 shrink-0 accent-white" />
                      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded bg-surface-2">
                        {p.coverFile ? <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="28px" unoptimized className="object-cover" /> : <Piano size={12} className="absolute inset-0 m-auto text-white/50" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-muted tabular-nums">{formatPrice(p.priceCents)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Aperçu des prix</span>
                <span className="text-muted tabular-nums">
                  {preview.length} produit{preview.length > 1 ? "s" : ""} en promo
                </span>
              </p>
              <div className="mt-2 max-h-[560px] overflow-y-auto rounded-xl border border-white/10">
                {preview.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted">Aucun produit concerné avec ces réglages.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-surface text-xs text-muted">
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-2 font-normal">Produit</th>
                        <th className="px-2 py-2 text-right font-normal">Prix</th>
                        <th className="px-2 py-2 text-right font-normal">Promo</th>
                        <th className="px-4 py-2 text-right font-normal">Remise</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {preview.map(({ p, cents, ownLower }) => (
                        <tr key={p.id}>
                          <td className="max-w-0 truncate px-4 py-2">
                            {p.name}
                            {ownLower && <span className="mt-0.5 block text-xs text-muted">Son prix promo ({formatPrice(p.ownSaleCents!)}) est plus bas : il est gardé.</span>}
                          </td>
                          <td className="px-2 py-2 text-right text-muted tabular-nums">
                            <s>{formatPrice(p.priceCents)}</s>
                          </td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatPrice(ownLower ? p.ownSaleCents! : cents)}</td>
                          <td className="px-4 py-2 text-right text-muted tabular-nums">-{Math.round((1 - (ownLower ? p.ownSaleCents! : cents) / p.priceCents) * 100)} %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
            {message && <p className={`mr-auto text-sm ${message.ok ? "text-foreground" : "text-red-400"}`}>{message.text}</p>}
            {dirty && (
              <button type="button" onClick={() => { setD(baseline); setMessage(null); }} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground">
                Annuler
              </button>
            )}
            <button type="button" onClick={save} disabled={!dirty || saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40">
              {saving && <Loader2 size={16} className="animate-spin" />} Enregistrer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
