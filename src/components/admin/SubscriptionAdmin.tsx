"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Gift, Loader2, Piano, Plus, Search, Trash2 } from "lucide-react";
import {
  giftSubscription,
  setSubscriptionEnabled,
  updateSubscriptionSettings,
  type FormulaInput,
  type SubscriptionSettingsInput,
} from "@/app/actions/subscriptions";
import { formatPrice, mediaUrl } from "@/lib/shop-format";
import { formulaIncludes, SUBSCRIPTION_STATE_LABELS, type Formula, type SubscriptionSettings } from "@/lib/subscription-plans";

export type AdminPlugin = { id: string; name: string; coverFile: string | null };
export type AdminSubscriber = {
  key: string;
  name: string;
  email: string;
  formulaName: string;
  state: keyof typeof SUBSCRIPTION_STATE_LABELS;
  endsLabel: string;
  sinceLabel: string;
  paid: number;
  gifts: number;
};
export type AdminStats = { active: number; trial: number; grace: number; revenueCents: number; passCount: number; trials: number; converted: number; pendingPasses: number };

const field =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-white/50";
const euros = (cents: number | null) => (cents ? (cents / 100).toString().replace(".", ",") : "");
const dateValue = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(iso)) : "");
const short = (name: string) => name.replace(/^Swell\s+/, "");

const STATE_STYLES: Record<AdminSubscriber["state"], string> = {
  none: "bg-white/5 text-muted",
  trial: "bg-white/15 text-foreground",
  active: "bg-white text-black",
  grace: "bg-amber-300 text-black",
  expired: "bg-white/5 text-muted",
};

const toInput = (f: Formula, plugins: AdminPlugin[]): FormulaInput => ({
  id: f.id,
  name: f.name,
  description: f.description,
  visible: f.visible,
  highlighted: f.highlighted,
  monthEnabled: f.monthEnabled,
  month: euros(f.monthCents),
  monthDays: String(f.monthDays),
  monthSale: euros(f.monthSaleCents),
  yearEnabled: f.yearEnabled,
  year: euros(f.yearCents),
  yearDays: String(f.yearDays),
  yearSale: euros(f.yearSaleCents),
  allPlugins: f.allPlugins,
  includedProductIds: plugins.filter((p) => formulaIncludes(f, p.id)).map((p) => p.id),
});

const blankFormula = (): FormulaInput => ({
  id: "",
  name: "",
  description: "",
  visible: true,
  highlighted: false,
  monthEnabled: true,
  month: "4,99",
  monthDays: "30",
  monthSale: "",
  yearEnabled: true,
  year: "49",
  yearDays: "365",
  yearSale: "",
  allPlugins: false,
  includedProductIds: [],
});

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-white" : "bg-white/15"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${checked ? "left-[22px] bg-black" : "left-0.5 bg-white/70"}`} />
    </button>
  );
}

function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-white" />
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function Cover({ file, size = 32 }: { file: string | null; size?: number }) {
  return (
    <span className="relative shrink-0 overflow-hidden rounded-md bg-surface-2" style={{ width: size, height: size }}>
      {file ? <Image src={mediaUrl(file)} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" /> : <Piano size={14} className="absolute inset-0 m-auto text-white/50" />}
    </span>
  );
}

/** Prix affichés dans la ligne d'une formule : « 7,99 € / mois · 69 € / an ». */
function priceSummary(f: FormulaInput) {
  const part = (on: boolean, price: string, sale: string, unit: string) =>
    on ? (sale ? `${sale} € (au lieu de ${price} €) / ${unit}` : `${price || "?"} € / ${unit}`) : null;
  return [part(f.monthEnabled, f.month, f.monthSale, "mois"), part(f.yearEnabled, f.year, f.yearSale, "an")].filter(Boolean).join(" · ") || "Aucun pass ouvert";
}

/** Éditeur d'une formule, déplié sous sa ligne. */
function FormulaEditor({ value, onChange, plugins }: { value: FormulaInput; onChange: (v: FormulaInput) => void; plugins: AdminPlugin[] }) {
  const [query, setQuery] = useState("");
  const set = <K extends keyof FormulaInput>(k: K) => (v: FormulaInput[K]) => onChange({ ...value, [k]: v });
  const shown = plugins.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (id: string, on: boolean) =>
    set("includedProductIds")(on ? [...new Set([...value.includedProductIds, id])] : value.includedProductIds.filter((x) => x !== id));

  return (
    <div className="grid grid-cols-1 gap-8 border-t border-white/10 px-5 py-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-6">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Nom</span>
            <input value={value.name} onChange={(e) => set("name")(e.target.value)} maxLength={60} placeholder="All Access, Vocal Pass…" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Description courte</span>
            <textarea
              value={value.description}
              onChange={(e) => set("description")(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Une phrase sur ce que la formule apporte."
              className={`${field} resize-none`}
            />
            <span className="mt-1 block text-right text-xs text-muted tabular-nums">{value.description.length} / 200</span>
          </label>
          <div className="space-y-3">
            <Check checked={value.visible} onChange={set("visible")} label="Proposée à la vente" hint="Décochée, plus personne ne peut l'acheter, mais ceux qui l'ont la gardent." />
            <Check checked={value.highlighted} onChange={set("highlighted")} label="Mise en avant" hint="Carte blanche et badge « Le plus choisi » sur la page." />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Pass</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
            <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-muted">
              <span>Durée</span>
              <span>Prix €</span>
              <span>Promo €</span>
              <span>Jours</span>
            </div>
            {(["month", "year"] as const).map((plan) => {
              const on = plan === "month" ? value.monthEnabled : value.yearEnabled;
              return (
                <div key={plan} className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] items-center gap-3 px-4 py-3 not-last:border-b not-last:border-white/5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={on} onChange={(e) => set(plan === "month" ? "monthEnabled" : "yearEnabled")(e.target.checked)} className="h-4 w-4 accent-white" />
                    {plan === "month" ? "1 mois" : "1 an"}
                  </label>
                  <input
                    aria-label={`Prix du pass ${plan === "month" ? "1 mois" : "1 an"}`}
                    disabled={!on}
                    inputMode="decimal"
                    value={plan === "month" ? value.month : value.year}
                    onChange={(e) => set(plan)(e.target.value)}
                    className={`${field} mt-0 tabular-nums disabled:opacity-40`}
                  />
                  <input
                    aria-label={`Prix promo du pass ${plan === "month" ? "1 mois" : "1 an"}`}
                    disabled={!on}
                    inputMode="decimal"
                    placeholder="—"
                    value={plan === "month" ? value.monthSale : value.yearSale}
                    onChange={(e) => set(plan === "month" ? "monthSale" : "yearSale")(e.target.value)}
                    className={`${field} mt-0 tabular-nums disabled:opacity-40`}
                  />
                  <input
                    aria-label={`Durée du pass ${plan === "month" ? "1 mois" : "1 an"} en jours`}
                    disabled={!on}
                    inputMode="numeric"
                    value={plan === "month" ? value.monthDays : value.yearDays}
                    onChange={(e) => set(plan === "month" ? "monthDays" : "yearDays")(e.target.value)}
                    className={`${field} mt-0 tabular-nums disabled:opacity-40`}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">La date de fin des promos se règle dans l&apos;onglet Réglages.</p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">
            Plugins compris <span className="font-normal text-muted tabular-nums">· {value.includedProductIds.length} sur {plugins.length}</span>
          </p>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Switch
              checked={value.allPlugins}
              label="Tous les plugins, et les prochains"
              onChange={(on) => onChange({ ...value, allPlugins: on, includedProductIds: on ? plugins.map((p) => p.id) : value.includedProductIds })}
            />
            Tous, et les prochains
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <span className="sr-only">Chercher un plugin</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un plugin" className={`${field} mt-0 pl-9`} />
          </label>
          <button type="button" onClick={() => set("includedProductIds")([...new Set([...value.includedProductIds, ...shown.map((p) => p.id)])])} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">
            Tout cocher
          </button>
          <button type="button" onClick={() => set("includedProductIds")(value.includedProductIds.filter((id) => !shown.some((p) => p.id === id)))} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">
            Tout décocher
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 max-h-[360px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {shown.map((p) => {
            const on = value.includedProductIds.includes(p.id);
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-2 text-sm transition-colors ${on ? "border-white/40 bg-white/[0.07]" : "border-white/5 hover:border-white/20"}`}
              >
                <input type="checkbox" checked={on} onChange={(e) => toggle(p.id, e.target.checked)} className="h-4 w-4 shrink-0 accent-white" />
                <Cover file={p.coverFile} />
                <span className="truncate">{short(p.name)}</span>
              </label>
            );
          })}
          {shown.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted">Aucun plugin ne correspond.</p>}
        </div>
        {value.allPlugins && <p className="mt-2 text-xs text-muted">Les plugins décochés restent hors de la formule ; tout nouveau plugin publié y entre d&apos;office.</p>}
      </div>
    </div>
  );
}

const TABS = [
  { id: "formules", label: "Formules" },
  { id: "abonnes", label: "Abonnés" },
  { id: "reglages", label: "Réglages" },
  { id: "offrir", label: "Offrir des jours" },
] as const;

/** Toute l'administration des abonnements : ouverture, chiffres, formules, abonnés, réglages, jours offerts. */
export function SubscriptionAdminPanel({
  settings,
  plugins,
  subscribers,
  stats,
}: {
  settings: SubscriptionSettings;
  plugins: AdminPlugin[];
  subscribers: AdminSubscriber[];
  stats: AdminStats;
}) {
  const initial = useMemo(
    () => ({
      formulas: settings.formulas.map((f) => toInput(f, plugins)),
      saleEndsAt: dateValue(settings.saleEndsAt),
      trialDays: String(settings.trialDays),
      trialIndex: Math.max(0, settings.formulas.findIndex((f) => f.id === settings.trialFormulaId)),
      graceDays: String(settings.graceDays),
      reminderDays: String(settings.reminderDays),
      trialReminderDays: String(settings.trialReminderDays),
    }),
    [settings, plugins],
  );
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("formules");
  const [enabled, setEnabled] = useState(settings.enabled);
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [toggling, startToggle] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setFormula = (i: number, v: FormulaInput) => set("formulas", draft.formulas.map((f, k) => (k === i ? v : f)));

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= draft.formulas.length) return;
    const next = [...draft.formulas];
    [next[i], next[j]] = [next[j], next[i]];
    const t = draft.trialIndex === i ? j : draft.trialIndex === j ? i : draft.trialIndex;
    setDraft((d) => ({ ...d, formulas: next, trialIndex: t }));
    setOpenIndex((o) => (o === i ? j : o === j ? i : o));
  }

  function remove(i: number) {
    const f = draft.formulas[i];
    if (!confirm(`Supprimer la formule ${f.name || "sans nom"} ? Ses abonnés en cours perdront l'accès à ses plugins. Pour arrêter de la vendre sans couper personne, décoche plutôt « Proposée à la vente ».`)) return;
    setDraft((d) => ({ ...d, formulas: d.formulas.filter((_, k) => k !== i), trialIndex: d.trialIndex === i ? 0 : d.trialIndex > i ? d.trialIndex - 1 : d.trialIndex }));
    setOpenIndex(null);
  }

  function save() {
    setMessage(null);
    startSave(async () => {
      const input: SubscriptionSettingsInput = {
        enabled,
        formulas: draft.formulas,
        saleEndsAt: draft.saleEndsAt,
        trialDays: draft.trialDays,
        trialFormulaIndex: draft.trialIndex,
        graceDays: draft.graceDays,
        reminderDays: draft.reminderDays,
        trialReminderDays: draft.trialReminderDays,
      };
      const result = await updateSubscriptionSettings(input);
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      setBaseline(draft);
      setMessage({ ok: true, text: "Enregistré. La page publique est à jour." });
    });
  }

  function toggleOpen(on: boolean) {
    setToggleError(null);
    startToggle(async () => {
      const result = await setSubscriptionEnabled(on);
      if ("error" in result) return setToggleError(result.error);
      setEnabled(on);
    });
  }

  const formulaNames = draft.formulas.map((f, i) => f.name.trim() || `Formule ${i + 1}`);

  return (
    <div className="pb-24">
      <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-surface p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Switch checked={enabled} onChange={toggleOpen} disabled={toggling} label="Abonnement ouvert" />
          <div>
            <p className="font-semibold">{enabled ? "Abonnement ouvert" : "Abonnement fermé"}</p>
            <p className="text-sm text-muted">
              {enabled ? "Les clients peuvent s'abonner et lancer l'essai." : "La page l'annonce sans permettre de s'abonner."}{" "}
              <Link href="/abonnement" target="_blank" className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline">
                Voir la page <ExternalLink size={13} />
              </Link>
            </p>
            {toggleError && <p className="mt-1 text-sm text-red-400">{toggleError}</p>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4 lg:flex lg:gap-8">
          {[
            ["Actifs", String(stats.active)],
            ["En essai", String(stats.trial)],
            ["À renouveler", String(stats.grace)],
            ["Encaissé 30 j", `${stats.revenueCents > 0 ? formatPrice(stats.revenueCents) : "0 €"}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {stats.pendingPasses > 0 && (
        <Link
          href="/admin/commandes?statut=pending"
          className="mt-3 flex items-center justify-between rounded-2xl border border-amber-300/40 bg-amber-300/10 px-5 py-3 text-sm transition-colors hover:bg-amber-300/15"
        >
          <span>
            <strong>{stats.pendingPasses}</strong> pass en attente de paiement à valider
          </span>
          <span className="text-muted">Commandes →</span>
        </Link>
      )}

      <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-white/10 [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? "border-white text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {t.id === "abonnes" && <span className="ml-1.5 text-muted tabular-nums">{subscribers.length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "formules" && (
          <div className="space-y-3">
            {draft.formulas.map((f, i) => {
              const isOpen = openIndex === i;
              const included = plugins.filter((p) => f.includedProductIds.includes(p.id));
              return (
                <div key={f.id || `new-${i}`} className={`overflow-hidden rounded-2xl border bg-surface ${isOpen ? "border-white/30" : "border-white/10"}`}>
                  <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <button type="button" onClick={() => setOpenIndex(isOpen ? null : i)} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-expanded={isOpen}>
                      <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{formulaNames[i]}</span>
                          {!f.visible && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted">Masquée</span>}
                          {f.highlighted && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-black">Mise en avant</span>}
                          {draft.trialIndex === i && Number(draft.trialDays) > 0 && <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs">Essai</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted">{priceSummary(f)}</span>
                      </span>
                    </button>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      <span className="flex">
                        {included.slice(0, 5).map((p, k) => (
                          <span key={p.id} className={k > 0 ? "-ml-2" : ""}>
                            <span className="block rounded-md ring-2 ring-surface">
                              <Cover file={p.coverFile} size={26} />
                            </span>
                          </span>
                        ))}
                      </span>
                      <span className="tabular-nums">{f.allPlugins ? "Tous" : `${included.length} plugin${included.length > 1 ? "s" : ""}`}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-30">
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === draft.formulas.length - 1} aria-label="Descendre" className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-30">
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" onClick={() => remove(i)} disabled={draft.formulas.length === 1} aria-label="Supprimer la formule" className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-30">
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                  {isOpen && <FormulaEditor value={f} onChange={(v) => setFormula(i, v)} plugins={plugins} />}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                set("formulas", [...draft.formulas, blankFormula()]);
                setOpenIndex(draft.formulas.length);
              }}
              disabled={draft.formulas.length >= 8}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 px-4 py-4 text-sm text-muted transition-colors hover:border-white/40 hover:text-foreground disabled:opacity-50"
            >
              <Plus size={16} /> Ajouter une formule
            </button>
          </div>
        )}

        {tab === "abonnes" && <Subscribers subscribers={subscribers} stats={stats} />}

        {tab === "reglages" && (
          <div className="grid grid-cols-1 max-w-3xl gap-x-8 gap-y-6 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Essai gratuit (jours)</span>
              <input inputMode="numeric" value={draft.trialDays} onChange={(e) => set("trialDays", e.target.value)} className={`${field} tabular-nums`} />
              <span className="mt-1 block text-xs text-muted">0 = pas d&apos;essai. Une fois par compte et par ordinateur.</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Formule de l&apos;essai</span>
              <select value={draft.trialIndex} onChange={(e) => set("trialIndex", Number(e.target.value))} className={`${field} [color-scheme:dark]`}>
                {formulaNames.map((n, i) => (
                  <option key={i} value={i}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">L&apos;essai ouvre les plugins de cette formule.</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Marge après la fin d&apos;un pass (jours)</span>
              <input inputMode="numeric" value={draft.graceDays} onChange={(e) => set("graceDays", e.target.value)} className={`${field} tabular-nums`} />
              <span className="mt-1 block text-xs text-muted">Les plugins marchent encore ces jours-là, le temps de valider un renouvellement.</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Fin des prix promo des pass</span>
              <input type="date" value={draft.saleEndsAt} onChange={(e) => set("saleEndsAt", e.target.value)} className={`${field} [color-scheme:dark]`} />
              <span className="mt-1 block text-xs text-muted">Pour toutes les formules. Vide : la promo dure tant que les prix promo sont remplis.</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Rappel avant la fin d&apos;un pass (jours)</span>
              <input inputMode="numeric" value={draft.reminderDays} onChange={(e) => set("reminderDays", e.target.value)} className={`${field} tabular-nums`} />
              <span className="mt-1 block text-xs text-muted">Puis un rappel la veille, et un à la fin.</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Rappel avant la fin de l&apos;essai (jours)</span>
              <input inputMode="numeric" value={draft.trialReminderDays} onChange={(e) => set("trialReminderDays", e.target.value)} className={`${field} tabular-nums`} />
              <span className="mt-1 block text-xs text-muted">Puis un email à la fin de l&apos;essai.</span>
            </label>
          </div>
        )}

        {tab === "offrir" && <GiftSubscriptionForm formulas={settings.formulas.map((f) => ({ id: f.id, name: f.name }))} />}
      </div>

      {(dirty || message) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className={`text-sm ${message && !message.ok ? "text-red-400" : dirty ? "text-foreground" : "text-muted"}`}>
              {message && (!dirty || !message.ok) ? message.text : "Modifications non enregistrées."}
            </p>
            <div className="flex items-center gap-2">
              {dirty && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(baseline);
                    setMessage(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground"
                >
                  Annuler
                </button>
              )}
              {dirty ? (
                <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
                  {saving && <Loader2 size={16} className="animate-spin" />} Enregistrer
                </button>
              ) : (
                <button type="button" onClick={() => setMessage(null)} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground">
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Liste des abonnés, avec recherche et filtre par état. */
function Subscribers({ subscribers, stats }: { subscribers: AdminSubscriber[]; stats: AdminStats }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | AdminSubscriber["state"]>("all");
  const shown = subscribers.filter(
    (s) => (state === "all" || s.state === state) && `${s.name} ${s.email} ${s.formulaName}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <span className="sr-only">Chercher un abonné</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, email ou formule" className={`${field} mt-0 pl-9`} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "active", "trial", "grace", "expired"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setState(s)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${state === s ? "bg-white text-black" : "border border-white/10 text-muted hover:text-foreground"}`}
            >
              {s === "all" ? "Tous" : SUBSCRIPTION_STATE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      {stats.trials > 0 && (
        <p className="mt-4 text-sm text-muted">
          {stats.trials} essai{stats.trials > 1 ? "s" : ""}, <span className="text-foreground">{stats.converted} devenu{stats.converted > 1 ? "s" : ""} abonné{stats.converted > 1 ? "s" : ""}</span> (
          {Math.round((stats.converted / stats.trials) * 100)} %).
        </p>
      )}
      {shown.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-muted">
          {subscribers.length === 0 ? "Personne n'a encore d'abonnement ni d'essai." : "Aucun abonné ne correspond."}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-normal">Client</th>
                <th className="px-4 py-2.5 font-normal">Formule</th>
                <th className="px-4 py-2.5 font-normal">État</th>
                <th className="px-4 py-2.5 font-normal">Fin</th>
                <th className="px-4 py-2.5 font-normal">Historique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {shown.map((s) => (
                <tr key={s.key}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted">{s.email}</p>
                  </td>
                  <td className="px-4 py-3">{s.formulaName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATE_STYLES[s.state]}`}>{SUBSCRIPTION_STATE_LABELS[s.state]}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{s.endsLabel}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    Depuis le {s.sinceLabel}
                    {s.paid > 0 && ` · ${s.paid} pass payé${s.paid > 1 ? "s" : ""}`}
                    {s.gifts > 0 && ` · ${s.gifts} cadeau${s.gifts > 1 ? "x" : ""}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Offrir des jours d'une formule à un compte (cadeau, dédommagement, partenariat...). */
function GiftSubscriptionForm({ formulas }: { formulas: { id: string; name: string }[] }) {
  const [email, setEmail] = useState("");
  const [formulaId, setFormulaId] = useState(formulas[0]?.id ?? "");
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function gift() {
    setMessage(null);
    start(async () => {
      const result = await giftSubscription(email, formulaId, days, note);
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      setMessage({ ok: true, text: `${days} jours offerts à ${result.name}. Un email lui a été envoyé.` });
      setEmail("");
      setNote("");
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted">Les jours s&apos;ajoutent à la suite de l&apos;accès en cours du client sur cette formule. Il reçoit un email.</p>
      <label className="block text-sm">
        <span className="font-medium">Email du compte</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@exemple.com" className={field} />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <label className="block text-sm">
          <span className="font-medium">Formule</span>
          <select value={formulaId} onChange={(e) => setFormulaId(e.target.value)} className={`${field} [color-scheme:dark]`}>
            {formulas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Jours</span>
          <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={`${field} tabular-nums`} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Mot joint à l&apos;email (facultatif)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={field} />
      </label>
      {message && <p className={`text-sm ${message.ok ? "text-foreground" : "text-red-400"}`}>{message.text}</p>}
      <button
        type="button"
        onClick={gift}
        disabled={pending || !email.trim() || !formulaId}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />} Offrir
      </button>
    </div>
  );
}
