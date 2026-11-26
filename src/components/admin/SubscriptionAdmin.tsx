"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Gift, Loader2, Plus, Trash2 } from "lucide-react";
import { giftSubscription, updateSubscriptionSettings, type FormulaInput } from "@/app/actions/subscriptions";
import { formulaIncludes, type Formula, type SubscriptionSettings } from "@/lib/subscription-plans";

const input =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-white/50";
const box = "space-y-4 rounded-xl border border-white/10 bg-background/40 p-4";
const euros = (cents: number | null) => (cents ? (cents / 100).toString().replace(".", ",") : "");
const dateValue = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(iso)) : "");

type Plugin = { id: string; name: string };

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-white" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function Field({ label, value, onChange, hint, ...rest }: { label: string; value: string; onChange: (v: string) => void; hint?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={input} {...rest} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const toInput = (f: Formula, plugins: Plugin[]): FormulaInput => ({
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

/** Une formule : nom, description, pass 1 mois / 1 an (prix, promo, durée), plugins compris. */
function FormulaEditor({
  value,
  onChange,
  plugins,
  onRemove,
  onMove,
  index,
  count,
}: {
  value: FormulaInput;
  onChange: (v: FormulaInput) => void;
  plugins: Plugin[];
  onRemove: () => void;
  onMove: (delta: number) => void;
  index: number;
  count: number;
}) {
  const set = <K extends keyof FormulaInput>(k: K) => (v: FormulaInput[K]) => onChange({ ...value, [k]: v });
  const iconButton = "rounded-md p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-30";
  return (
    <div className="space-y-4 rounded-2xl border border-white/15 bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{value.name.trim() || "Nouvelle formule"}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Monter" className={iconButton}>
            <ArrowUp size={16} />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Descendre" className={iconButton}>
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  `Supprimer la formule ${value.name || "sans nom"} ? Ses abonnés en cours perdront l'accès à ses plugins. Pour arrêter de la vendre sans couper personne, décoche plutôt « Proposée à la vente ».`,
                )
              )
                onRemove();
            }}
            disabled={count === 1}
            aria-label="Supprimer la formule"
            className={iconButton}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom" value={value.name} onChange={set("name")} placeholder="All Access, Essentials…" maxLength={60} />
        <Field label="Description courte" value={value.description} onChange={set("description")} placeholder="Tous les plugins, nouveautés comprises" maxLength={200} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Toggle checked={value.visible} onChange={set("visible")} label="Proposée à la vente" hint="Décochée, ceux qui l'ont la gardent." />
        <Toggle checked={value.highlighted} onChange={set("highlighted")} label="Mise en avant" hint="Badge « Le plus choisi »." />
      </div>

      {(["month", "year"] as const).map((plan) => (
        <div key={plan} className={box}>
          <Toggle
            checked={plan === "month" ? value.monthEnabled : value.yearEnabled}
            onChange={set(plan === "month" ? "monthEnabled" : "yearEnabled")}
            label={plan === "month" ? "Pass 1 mois" : "Pass 1 an"}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Prix (€)" inputMode="decimal" value={plan === "month" ? value.month : value.year} onChange={set(plan)} />
            <Field
              label="Prix promo (€)"
              inputMode="decimal"
              placeholder="Vide = pas de promo"
              value={plan === "month" ? value.monthSale : value.yearSale}
              onChange={set(plan === "month" ? "monthSale" : "yearSale")}
            />
            <Field
              label="Durée (jours)"
              inputMode="numeric"
              value={plan === "month" ? value.monthDays : value.yearDays}
              onChange={set(plan === "month" ? "monthDays" : "yearDays")}
            />
          </div>
        </div>
      ))}

      <fieldset className={box}>
        <legend className="px-1 text-sm font-medium">Plugins compris</legend>
        <Toggle
          checked={value.allPlugins}
          onChange={(on) => onChange({ ...value, allPlugins: on, includedProductIds: on ? plugins.map((p) => p.id) : value.includedProductIds })}
          label="Tous les plugins, et les prochains d'office"
          hint="Décoché, seuls les plugins cochés ci-dessous sont compris."
        />
        {plugins.length === 0 ? (
          <p className="text-xs text-muted">Aucun plugin publié avec un fichier pour le moment.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {plugins.map((p) => (
              <Toggle
                key={p.id}
                label={p.name}
                checked={value.includedProductIds.includes(p.id)}
                onChange={(on) =>
                  set("includedProductIds")(on ? [...value.includedProductIds, p.id] : value.includedProductIds.filter((id) => id !== p.id))
                }
              />
            ))}
          </div>
        )}
        <p className="text-xs text-muted">
          {value.includedProductIds.length} plugin{value.includedProductIds.length > 1 ? "s" : ""} sur {plugins.length}
        </p>
      </fieldset>
    </div>
  );
}

/** Tous les réglages de l'abonnement : ouverture, formules, promo des pass, essai, marge, rappels. */
export function SubscriptionSettingsForm({ settings, plugins }: { settings: SubscriptionSettings; plugins: Plugin[] }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [formulas, setFormulas] = useState<FormulaInput[]>(settings.formulas.map((f) => toInput(f, plugins)));
  const [saleEndsAt, setSaleEndsAt] = useState(dateValue(settings.saleEndsAt));
  const [trialDays, setTrialDays] = useState(String(settings.trialDays));
  const [trialIndex, setTrialIndex] = useState(Math.max(0, settings.formulas.findIndex((f) => f.id === settings.trialFormulaId)));
  const [graceDays, setGraceDays] = useState(String(settings.graceDays));
  const [reminderDays, setReminderDays] = useState(String(settings.reminderDays));
  const [trialReminderDays, setTrialReminderDays] = useState(String(settings.trialReminderDays));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMessage(null);
    start(async () => {
      const result = await updateSubscriptionSettings({
        enabled,
        formulas,
        saleEndsAt,
        trialDays,
        trialFormulaIndex: trialIndex,
        graceDays,
        reminderDays,
        trialReminderDays,
      });
      setMessage("error" in result ? { ok: false, text: result.error } : { ok: true, text: "Réglages enregistrés." });
    });
  }

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= formulas.length) return;
    const next = [...formulas];
    [next[i], next[j]] = [next[j], next[i]];
    setFormulas(next);
    if (trialIndex === i) setTrialIndex(j);
    else if (trialIndex === j) setTrialIndex(i);
  }

  function remove(i: number) {
    setFormulas(formulas.filter((_, k) => k !== i));
    setTrialIndex((t) => (t === i ? 0 : t > i ? t - 1 : t));
  }

  return (
    <div className="space-y-4">
      <div className={box}>
        <Toggle
          checked={enabled}
          onChange={setEnabled}
          label="Abonnement ouvert"
          hint="Fermé, la page /abonnement l'annonce sans permettre de s'abonner ni de lancer l'essai."
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Formules ({formulas.length})</p>
        {formulas.map((f, i) => (
          <FormulaEditor
            key={f.id || `new-${i}`}
            value={f}
            index={i}
            count={formulas.length}
            plugins={plugins}
            onChange={(v) => setFormulas(formulas.map((x, k) => (k === i ? v : x)))}
            onRemove={() => remove(i)}
            onMove={(d) => move(i, d)}
          />
        ))}
        <button
          type="button"
          onClick={() => setFormulas([...formulas, blankFormula()])}
          disabled={formulas.length >= 8}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          <Plus size={16} /> Ajouter une formule
        </button>
      </div>

      <Field
        label="Fin des prix promo des pass"
        type="date"
        value={saleEndsAt}
        onChange={setSaleEndsAt}
        className={`${input} [color-scheme:dark]`}
        hint="Pour toutes les formules. Sans date, la promo dure jusqu'à ce que tu vides les prix promo."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Essai gratuit (jours)" inputMode="numeric" value={trialDays} onChange={setTrialDays} hint="0 = pas d'essai. Un seul essai par compte et par ordinateur." />
        <label className="block text-sm">
          <span className="font-medium">Formule de l&apos;essai</span>
          <select value={trialIndex} onChange={(e) => setTrialIndex(Number(e.target.value))} className={`${input} [color-scheme:dark]`}>
            {formulas.map((f, i) => (
              <option key={f.id || `new-${i}`} value={i}>
                {f.name.trim() || "Nouvelle formule"}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">L&apos;essai donne accès aux plugins de cette formule.</span>
        </label>
        <Field label="Marge après la fin (jours)" inputMode="numeric" value={graceDays} onChange={setGraceDays} hint="Les plugins marchent encore ces jours-là, le temps de valider un renouvellement." />
        <Field label="Rappel avant la fin d'un pass (jours)" inputMode="numeric" value={reminderDays} onChange={setReminderDays} hint="Puis un rappel la veille et un à la fin." />
        <Field label="Rappel avant la fin de l'essai (jours)" inputMode="numeric" value={trialReminderDays} onChange={setTrialReminderDays} hint="Puis un email à la fin de l'essai." />
      </div>

      {message && <p className={`text-sm ${message.ok ? "text-foreground" : "text-red-300"}`}>{message.text}</p>}
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {pending && <Loader2 size={16} className="animate-spin" />} Enregistrer
      </button>
    </div>
  );
}

/** Offrir des jours d'une formule à un compte (cadeau, dédommagement, partenariat...). */
export function GiftSubscriptionForm({ formulas }: { formulas: { id: string; name: string }[] }) {
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
    <div className="space-y-3">
      <Field label="Email du compte" type="email" value={email} onChange={setEmail} placeholder="client@exemple.com" />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px]">
        <label className="block text-sm">
          <span className="font-medium">Formule</span>
          <select value={formulaId} onChange={(e) => setFormulaId(e.target.value)} className={`${input} [color-scheme:dark]`}>
            {formulas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <Field label="Jours" inputMode="numeric" value={days} onChange={setDays} />
      </div>
      <Field label="Mot joint à l'email (facultatif)" value={note} onChange={setNote} maxLength={300} />
      {message && <p className={`text-sm ${message.ok ? "text-foreground" : "text-red-300"}`}>{message.text}</p>}
      <button
        type="button"
        onClick={gift}
        disabled={pending || !email.trim() || !formulaId}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />} Offrir
      </button>
    </div>
  );
}
