"use client";

import { useState, useTransition } from "react";
import { Gift, Loader2 } from "lucide-react";
import { giftSubscription, updateSubscriptionSettings } from "@/app/actions/subscriptions";
import type { SubscriptionSettings } from "@/lib/subscription-plans";

const input =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-white/50";
const euros = (cents: number) => (cents / 100).toString().replace(".", ",");

const dateValue = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(iso)) : "");

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

/** Tous les réglages de l'abonnement : ouverture, formules, promo des pass, essai, marge, rappels, plugins compris. */
export function SubscriptionSettingsForm({ settings, plugins }: { settings: SubscriptionSettings; plugins: { id: string; name: string }[] }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [monthEnabled, setMonthEnabled] = useState(settings.monthEnabled);
  const [month, setMonth] = useState(euros(settings.monthCents));
  const [monthDays, setMonthDays] = useState(String(settings.monthDays));
  const [monthSale, setMonthSale] = useState(settings.monthSaleCents ? euros(settings.monthSaleCents) : "");
  const [yearEnabled, setYearEnabled] = useState(settings.yearEnabled);
  const [year, setYear] = useState(euros(settings.yearCents));
  const [yearDays, setYearDays] = useState(String(settings.yearDays));
  const [yearSale, setYearSale] = useState(settings.yearSaleCents ? euros(settings.yearSaleCents) : "");
  const [saleEndsAt, setSaleEndsAt] = useState(dateValue(settings.saleEndsAt));
  const [trialDays, setTrialDays] = useState(String(settings.trialDays));
  const [graceDays, setGraceDays] = useState(String(settings.graceDays));
  const [reminderDays, setReminderDays] = useState(String(settings.reminderDays));
  const [trialReminderDays, setTrialReminderDays] = useState(String(settings.trialReminderDays));
  const [included, setIncluded] = useState(plugins.filter((p) => !settings.excludedProductIds.includes(p.id)).map((p) => p.id));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMessage(null);
    start(async () => {
      const result = await updateSubscriptionSettings({
        enabled,
        monthEnabled,
        month,
        monthDays,
        monthSale,
        yearEnabled,
        year,
        yearDays,
        yearSale,
        saleEndsAt,
        trialDays,
        graceDays,
        reminderDays,
        trialReminderDays,
        includedProductIds: included,
      });
      setMessage("error" in result ? { ok: false, text: result.error } : { ok: true, text: "Réglages enregistrés." });
    });
  }

  const box = "space-y-4 rounded-xl border border-white/10 bg-background/40 p-4";
  const planBlock = (
    label: string,
    on: boolean,
    setOn: (v: boolean) => void,
    price: string,
    setPrice: (v: string) => void,
    days: string,
    setDays: (v: string) => void,
    sale: string,
    setSale: (v: string) => void,
  ) => (
    <div className={box}>
      <Toggle checked={on} onChange={setOn} label={`Pass ${label}`} hint="Décoché, cette formule n'est plus proposée." />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium">Prix (€)</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={input} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Prix promo (€)</span>
          <input value={sale} onChange={(e) => setSale(e.target.value)} inputMode="decimal" placeholder="Vide = pas de promo" className={input} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Durée (jours)</span>
          <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className={input} />
        </label>
      </div>
    </div>
  );

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

      {planBlock("1 mois", monthEnabled, setMonthEnabled, month, setMonth, monthDays, setMonthDays, monthSale, setMonthSale)}
      {planBlock("1 an", yearEnabled, setYearEnabled, year, setYear, yearDays, setYearDays, yearSale, setYearSale)}
      <label className="block text-sm">
        <span className="font-medium">Fin de la promo des pass</span>
        <input type="date" value={saleEndsAt} onChange={(e) => setSaleEndsAt(e.target.value)} className={`${input} [color-scheme:dark]`} />
        <span className="mt-1 block text-xs text-muted">Le prix normal s&apos;affiche barré à côté du prix promo. Sans date, la promo dure jusqu&apos;à ce que tu vides le champ.</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Essai gratuit (jours)</span>
          <input value={trialDays} onChange={(e) => setTrialDays(e.target.value)} inputMode="numeric" className={input} />
          <span className="mt-1 block text-xs text-muted">0 = pas d&apos;essai. Un seul essai par compte et par ordinateur.</span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Marge après la fin (jours)</span>
          <input value={graceDays} onChange={(e) => setGraceDays(e.target.value)} inputMode="numeric" className={input} />
          <span className="mt-1 block text-xs text-muted">Les plugins marchent encore ces jours-là, le temps de valider un renouvellement.</span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Rappel avant la fin d&apos;un pass (jours)</span>
          <input value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} inputMode="numeric" className={input} />
          <span className="mt-1 block text-xs text-muted">Puis un rappel la veille et un à la fin.</span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Rappel avant la fin de l&apos;essai (jours)</span>
          <input value={trialReminderDays} onChange={(e) => setTrialReminderDays(e.target.value)} inputMode="numeric" className={input} />
          <span className="mt-1 block text-xs text-muted">Puis un email à la fin de l&apos;essai.</span>
        </label>
      </div>

      <fieldset className={box}>
        <legend className="px-1 text-sm font-medium">Plugins compris</legend>
        {plugins.length === 0 ? (
          <p className="text-xs text-muted">Aucun plugin publié avec un fichier pour le moment.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {plugins.map((p) => (
              <Toggle
                key={p.id}
                label={p.name}
                checked={included.includes(p.id)}
                onChange={(on) => setIncluded((list) => (on ? [...list, p.id] : list.filter((id) => id !== p.id)))}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-muted">Un nouveau plugin publié entre d&apos;office dans l&apos;abonnement : décoche-le ici pour le garder à l&apos;unité.</p>
      </fieldset>

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

/** Offrir des jours d'accès à un compte (cadeau, dédommagement, partenariat...). */
export function GiftSubscriptionForm() {
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function gift() {
    setMessage(null);
    start(async () => {
      const result = await giftSubscription(email, days, note);
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      setMessage({ ok: true, text: `${days} jours offerts à ${result.name}. Un email lui a été envoyé.` });
      setEmail("");
      setNote("");
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <label className="block text-sm">
          <span className="font-medium">Email du compte</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="client@exemple.com" className={input} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Jours</span>
          <input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" className={input} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Mot joint à l&apos;email (facultatif)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={input} />
      </label>
      {message && <p className={`text-sm ${message.ok ? "text-foreground" : "text-red-300"}`}>{message.text}</p>}
      <button
        type="button"
        onClick={gift}
        disabled={pending || !email.trim()}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />} Offrir
      </button>
    </div>
  );
}
