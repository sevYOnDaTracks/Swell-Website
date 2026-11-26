"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, FlaskConical, Loader2, Lock } from "lucide-react";
import { checkSubscriptionPromo, createSubscriptionOrder, startAllAccessTrial } from "@/app/actions/subscriptions";
import { askEmailVerification } from "@/components/auth/EmailVerificationPrompt";
import { PaymentMethodPicker } from "@/components/cart/PaymentMethodPicker";
import { isMobileMethod, METHOD_LABELS, METHOD_ORDER, type PayMethod, type PaymentOptions } from "@/lib/payments";
import { formatPrice } from "@/lib/shop-format";
import {
  enabledPlans,
  lowestMonthlyCents,
  PLANS,
  planDays,
  planPrice,
  planRegularPrice,
  planSalePrice,
  yearlySaving,
  type Formula,
  type Plan,
  type SubscriptionSettings,
} from "@/lib/subscription-plans";

export type Viewer = {
  loggedIn: boolean;
  trialUsed: boolean;
  // Une ligne par formule que le client a eue : état et fin déjà formatée (« 12 décembre 2026 »).
  access: { formulaId: string; name: string; state: "trial" | "active" | "grace" | "expired" | "none"; endsLabel: string }[];
};

export type FormulaCard = { formula: Formula; pluginNames: string[] };

const errorBox = "mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300";

/** Essai gratuit, choix de la formule et du pass, code promo et paiement. */
export function SubscribeForm({
  settings,
  formulas,
  payments,
  viewer,
}: {
  settings: SubscriptionSettings;
  formulas: FormulaCard[];
  payments: PaymentOptions;
  viewer: Viewer;
}) {
  const router = useRouter();
  const available = METHOD_ORDER.filter((m) => payments[m]);
  const [formulaId, setFormulaId] = useState((formulas.find((f) => f.formula.highlighted) ?? formulas[0])?.formula.id ?? "");
  const formula = formulas.find((f) => f.formula.id === formulaId)?.formula ?? formulas[0]?.formula;
  const plans = formula ? enabledPlans(formula) : [];
  const [chosenPlan, setPlan] = useState<Plan>("month");
  const plan: Plan = plans.includes(chosenPlan) ? chosenPlan : (plans[0] ?? "month");
  const [method, setMethod] = useState<PayMethod | null>(available[0] ?? null);
  const [waived, setWaived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountCents: number; key: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [ordering, startOrder] = useTransition();
  const [checkingPromo, startPromo] = useTransition();
  const [startingTrial, startTrial] = useTransition();

  if (!formula) return null;

  const passKey = `${formula.id}:${plan}`;
  const price = planPrice(settings, formula, plan);
  // La remise d'un code dépend du pass : changer de formule ou de durée la recalcule.
  const discount = promo && promo.key === passKey ? promo.discountCents : 0;
  const total = price - discount;
  const trialFormula = formulas.find((f) => f.formula.id === settings.trialFormulaId)?.formula;
  const canTrial = settings.trialDays > 0 && !!trialFormula && !viewer.trialUsed && viewer.access.length === 0;
  const current = viewer.access.find((a) => a.formulaId === formula.id);
  const renewing = current?.state === "active" || current?.state === "grace";
  const saleEndLabel = settings.saleEndsAt
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(settings.saleEndsAt))
    : null;

  const gate = (result: object, next: string) => {
    if ("needsAccount" in result) {
      router.push(`/inscription?next=${encodeURIComponent(next)}`);
      return true;
    }
    if ("needsVerification" in result) {
      askEmailVerification();
      return true;
    }
    return false;
  };

  function onTrial() {
    setTrialError(null);
    startTrial(async () => {
      const result = await startAllAccessTrial();
      if ("needsVerification" in result) setTrialError("Confirme d'abord ton adresse email pour lancer l'essai.");
      if (gate(result, "/abonnement")) return;
      if ("error" in result) return setTrialError(result.error);
      router.push("/compte/plugins");
    });
  }

  function applyPromo() {
    setPromoError(null);
    startPromo(async () => {
      const result = await checkSubscriptionPromo(promoInput, formula!.id, plan);
      if (!("code" in result) || !result.code) {
        setPromo(null);
        return setPromoError(result.error ?? "Ce code promo n'est pas valable.");
      }
      setPromo({ code: result.code, discountCents: result.discountCents, key: passKey });
    });
  }

  function order() {
    setError(null);
    startOrder(async () => {
      const result = await createSubscriptionOrder(formula!.id, plan, waived, total === 0 ? "paypal" : method!, promo?.key === passKey ? promo.code : undefined);
      if ("needsVerification" in result) setError("Confirme d'abord ton adresse email pour commander.");
      if (gate(result, "/abonnement#formules")) return;
      if (!("ok" in result)) {
        if ("error" in result) setError(result.error);
        return;
      }
      router.push(result.paid ? "/compte/plugins" : `/compte/commandes/${result.reference}`);
    });
  }

  return (
    <div className="space-y-6">
      {canTrial && (
        <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5">
          <p className="flex items-center gap-2 font-semibold">
            <FlaskConical size={18} /> {settings.trialDays} jours gratuits avec {trialFormula!.name}
          </p>
          <p className="mt-1 text-sm text-muted">
            Sans paiement et sans engagement. À la fin de l&apos;essai, rien n&apos;est prélevé : tu choisis si tu continues.
          </p>
          <button
            type="button"
            onClick={onTrial}
            disabled={startingTrial}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            {startingTrial ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
            Commencer l&apos;essai gratuit
          </button>
          {trialError && (
            <p role="alert" className={errorBox}>
              {trialError}
            </p>
          )}
        </div>
      )}

      {formulas.length > 1 && (
        <fieldset>
          <legend className="text-sm font-medium">Choisis ta formule</legend>
          <div role="radiogroup" className={`mt-2 grid gap-3 ${formulas.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {formulas.map(({ formula: f, pluginNames }) => {
              const selected = f.id === formula.id;
              const from = lowestMonthlyCents(settings, f);
              const mine = viewer.access.find((a) => a.formulaId === f.id && a.state !== "expired");
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFormulaId(f.id)}
                  className={`relative flex flex-col rounded-2xl border p-5 text-left transition-colors ${
                    selected ? "border-white bg-white/10" : "border-white/10 bg-surface hover:border-white/30"
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{f.name}</span>
                    {f.highlighted && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">Le plus choisi</span>}
                    {mine && <span className="rounded-full border border-white/30 px-2 py-0.5 text-xs">Ta formule</span>}
                  </span>
                  {f.description && <span className="mt-1 text-sm text-muted">{f.description}</span>}
                  {from !== null && <span className="mt-3 text-sm">dès <strong className="text-xl">{formatPrice(from)}</strong> / mois</span>}
                  <span className="mt-3 text-xs text-muted">
                    {pluginNames.length} plugin{pluginNames.length > 1 ? "s" : ""}
                    {pluginNames.length > 0 && ` : ${pluginNames.slice(0, 6).join(", ")}${pluginNames.length > 6 ? "…" : ""}`}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {current && current.state !== "expired" && (
            <p className="rounded-2xl border border-white/10 bg-surface px-5 py-4 text-sm">
              {current.state === "trial" ? (
                <>
                  Ton essai de {current.name} court jusqu&apos;au <strong>{current.endsLabel}</strong>. Un pass pris maintenant commence à la fin
                  de l&apos;essai : tu ne perds aucun jour.
                </>
              ) : current.state === "grace" ? (
                <>
                  Ton accès à {current.name} est arrivé à son terme le <strong>{current.endsLabel}</strong> : renouvelle-le pour garder tes plugins
                  actifs.
                </>
              ) : (
                <>
                  Ton accès à {current.name} court jusqu&apos;au <strong>{current.endsLabel}</strong>. Un nouveau pass s&apos;ajoute à la suite : tu
                  ne perds aucun jour.
                </>
              )}
            </p>
          )}

          <fieldset>
            <legend className="text-sm font-medium">
              {formulas.length > 1 ? `${formula.name} : ` : ""}
              {renewing ? "prolonger avec" : "choisis la durée"}
            </legend>
            <div role="radiogroup" className={`mt-2 grid gap-3 ${plans.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {plans.map((p) => {
                const selected = plan === p;
                const cents = planPrice(settings, formula, p);
                const regular = planSalePrice(settings, formula, p) ? planRegularPrice(formula, p) : null;
                const saving = p === "year" ? yearlySaving(settings, formula) : 0;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPlan(p)}
                    className={`relative rounded-2xl border p-5 text-left transition-colors ${
                      selected ? "border-white bg-white/10" : "border-white/10 bg-surface hover:border-white/30"
                    }`}
                  >
                    {saving > 0 && (
                      <span className="absolute right-4 top-4 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">-{saving} %</span>
                    )}
                    <p className="text-sm text-muted">Pass {PLANS[p].label}</p>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                      <span className="text-3xl font-bold tracking-tight">{formatPrice(cents)}</span>
                      {regular && <s className="text-base text-muted">{formatPrice(regular)}</s>}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {planDays(formula, p)} jours d&apos;accès
                      {planDays(formula, p) >= 60 ? ` · soit ${formatPrice(Math.round((cents * 30) / planDays(formula, p)))} par mois` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <ul className="grid gap-2 text-sm text-foreground/85 sm:grid-cols-2">
            {[
              formula.allPlugins ? "Tous les plugins Swell, nouveautés comprises" : "Les plugins de la formule, prêts à télécharger",
              "Pas de prélèvement automatique : tu prolonges quand tu veux",
              "Un rappel par email avant la fin de ton accès",
              "Un plugin acheté à l'unité reste à toi pour toujours",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 shrink-0" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <aside id="paiement" className="h-fit rounded-2xl border border-white/10 bg-surface p-5">
          <p className="text-sm text-muted">
            {formula.name} · pass {PLANS[plan].label}
            {saleEndLabel && planSalePrice(settings, formula, plan) ? ` · promo jusqu'au ${saleEndLabel}` : ""}
          </p>
          <p className="mt-1 flex items-baseline justify-between">
            <span className="text-sm text-muted">Total</span>
            <span className="text-2xl font-bold tracking-tight">{formatPrice(total)}</span>
          </p>
          {discount > 0 && promo && (
            <p className="mt-1 flex items-center justify-between text-sm text-muted">
              <span>
                Code {promo.code} : -{formatPrice(discount)}
              </span>
              <button type="button" onClick={() => setPromo(null)} className="underline underline-offset-2 hover:text-foreground">
                Retirer
              </button>
            </p>
          )}
          {discount === 0 && (
            <div className="mt-4">
              <div className="flex gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Code promo</span>
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Code promo"
                    className="block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm uppercase outline-none placeholder:normal-case focus:border-white/50"
                  />
                </label>
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={!promoInput.trim() || checkingPromo}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                  Appliquer
                </button>
              </div>
              {promoError && (
                <p role="alert" className="mt-2 text-xs text-red-300">
                  {promoError}
                </p>
              )}
            </div>
          )}

          {total === 0 || available.length > 0 ? (
            <>
              {total > 0 && <PaymentMethodPicker methods={available} value={method} onChange={setMethod} totalCents={total} />}
              <label className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-foreground/85">
                <input type="checkbox" checked={waived} onChange={(e) => setWaived(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-white" />
                <span>
                  J&apos;accepte les{" "}
                  <Link href="/cgv" className="underline underline-offset-2">
                    CGV
                  </Link>
                  , je demande l&apos;accès aux plugins dès réception du paiement et je renonce à mon droit de rétractation une fois le premier
                  téléchargement commencé.
                </span>
              </label>
              {error && (
                <p role="alert" className={errorBox}>
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={order}
                disabled={!waived || ordering || (total > 0 && !method)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                {ordering && <Loader2 size={16} className="animate-spin" />}
                {total === 0 ? "Valider" : `${renewing ? "Prolonger" : "M'abonner"} · ${method ? METHOD_LABELS[method] : ""}`}
              </button>
              <p className="mt-3 text-xs text-muted">
                {method && isMobileMethod(method) && total > 0
                  ? "Tu verras le numéro et le montant exact. Après le paiement, envoie la capture depuis ton espace : l'accès est ouvert dès validation."
                  : "Ta commande reçoit une référence à mettre dans ton paiement. L'accès est ouvert dès que le paiement est vérifié."}
              </p>
            </>
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-black opacity-50"
            >
              <Lock size={16} /> Paiement bientôt disponible
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
