"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowRight, Check, FlaskConical, Loader2, Lock } from "lucide-react";
import { checkSubscriptionPromo, createSubscriptionOrder, startAllAccessTrial } from "@/app/actions/subscriptions";
import { askEmailVerification } from "@/components/auth/EmailVerificationPrompt";
import { PaymentMethodPicker } from "@/components/cart/PaymentMethodPicker";
import { isMobileMethod, METHOD_LABELS, METHOD_ORDER, type PayMethod, type PaymentOptions } from "@/lib/payments";
import { formatPrice } from "@/lib/shop-format";
import { FormulaCard, type CardPlugin } from "./FormulaCard";
import {
  enabledPlans,
  PLANS,
  planDays,
  planEnabled,
  planPrice,
  planRegularPrice,
  planSalePrice,
  yearlySaving,
  type Formula,
  type Plan,
  type SubscriptionSettings,
} from "@/lib/subscription-plans";

export type PricingPlugin = CardPlugin;
export type PricingFormula = { formula: Formula; plugins: PricingPlugin[] };
export type Viewer = {
  loggedIn: boolean;
  trialUsed: boolean;
  // Une ligne par formule que le client a eue : état et fin déjà formatée (« 12 décembre 2026 »).
  access: { formulaId: string; name: string; state: "trial" | "active" | "grace" | "expired" | "none"; endsLabel: string }[];
};

const STATE_TEXT = { trial: "Essai en cours", active: "Actif", grace: "À renouveler", expired: "Terminé", none: "" } as const;

/** Tableau des formules (bascule mois / an), puis l'étape de paiement de la formule choisie. */
export function PricingTable({
  settings,
  formulas,
  payments,
  viewer,
}: {
  settings: SubscriptionSettings;
  formulas: PricingFormula[];
  payments: PaymentOptions;
  viewer: Viewer;
}) {
  const router = useRouter();
  const checkoutRef = useRef<HTMLDivElement>(null);
  const available = METHOD_ORDER.filter((m) => payments[m]);
  const open = settings.enabled;
  const offersYear = formulas.some((f) => f.formula.yearEnabled);
  const offersMonth = formulas.some((f) => f.formula.monthEnabled);
  const [period, setPeriod] = useState<Plan>(offersMonth ? "month" : "year");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("month");
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

  const selected = formulas.find((f) => f.formula.id === selectedId);
  const canTrial = open && settings.trialDays > 0 && !viewer.trialUsed && viewer.access.length === 0;
  const bestSaving = Math.max(0, ...formulas.map((f) => yearlySaving(settings, f.formula)));
  const current = viewer.access.filter((a) => a.state !== "expired");

  /** Pass affiché pour une formule : la durée choisie en haut, sinon celle qu'elle propose. */
  const shownPlan = (f: Formula): Plan => (planEnabled(f, period) ? period : (enabledPlans(f)[0] ?? period));

  function choose(f: Formula) {
    setSelectedId(f.id);
    setPlan(shownPlan(f));
    setError(null);
    requestAnimationFrame(() => checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

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

  return (
    <div>
      {current.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface px-5 py-4 text-sm">
          <p>
            {current.map((a, i) => (
              <span key={a.formulaId}>
                {i > 0 && " · "}
                Ton abonnement <strong>{a.name}</strong> : {STATE_TEXT[a.state].toLowerCase()}
                {a.state === "grace" ? `, terminé le ${a.endsLabel}` : ` jusqu'au ${a.endsLabel}`}
              </span>
            ))}
          </p>
          <Link href="/compte/plugins" className="inline-flex items-center gap-1.5 text-muted underline-offset-4 hover:text-foreground hover:underline">
            Mes plugins <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {offersMonth && offersYear && (
        <div className="mb-10 flex justify-center">
          <div role="radiogroup" aria-label="Durée du pass" className="inline-flex rounded-full border border-white/10 bg-surface p-1 text-sm">
            {(["month", "year"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                onClick={() => setPeriod(p)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 font-medium transition-colors ${
                  period === p ? "bg-primary text-black" : "text-muted hover:text-foreground"
                }`}
              >
                Pass {PLANS[p].label}
                {p === "year" && bestSaving > 0 && (
                  <span className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${period === p ? "bg-black text-white" : "bg-white/10 text-foreground"}`}>
                    -{bestSaving} %
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${formulas.length === 1 ? "mx-auto max-w-md" : formulas.length === 2 ? "mx-auto max-w-4xl md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
        {formulas.map(({ formula: f, plugins }) => {
          const mine = current.find((a) => a.formulaId === f.id);
          const isTrialFormula = canTrial && f.id === settings.trialFormulaId;
          const inv = f.highlighted;
          return (
            <FormulaCard
              key={f.id}
              settings={settings}
              formula={f}
              plugins={plugins}
              plan={shownPlan(f)}
              mine={!!mine}
              selected={selectedId === f.id}
              cta={
                open ? (
                  <button
                    type="button"
                    onClick={() => choose(f)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-4 font-semibold transition-colors ${
                      inv ? "bg-black text-white hover:bg-neutral-800" : "bg-primary text-black hover:bg-neutral-200"
                    }`}
                  >
                    {mine ? "Prolonger" : `Choisir ${f.name}`} <ArrowRight size={17} />
                  </button>
                ) : (
                  <span className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-4 text-sm ${inv ? "border-black/20" : "border-white/15 text-muted"}`}>
                    <Lock size={15} /> Bientôt disponible
                  </span>
                )
              }
              extra={
                isTrialFormula ? (
                  <>
                    <button
                      type="button"
                      onClick={onTrial}
                      disabled={startingTrial}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                        inv ? "border-black/25 hover:bg-black/5" : "border-white/20 hover:bg-white/5"
                      }`}
                    >
                      {startingTrial ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
                      Essayer {settings.trialDays} jours gratuitement
                    </button>
                    {trialError && (
                      <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        {trialError}
                      </p>
                    )}
                  </>
                ) : null
              }
            />
          );
        })}
      </div>

      <div ref={checkoutRef} className="scroll-mt-24">
        {selected && open && (
          <Checkout
            key={selected.formula.id}
            settings={settings}
            item={selected}
            plan={plan}
            setPlan={setPlan}
            available={available}
            method={method}
            setMethod={setMethod}
            waived={waived}
            setWaived={setWaived}
            error={error}
            ordering={ordering}
            promo={promo}
            promoInput={promoInput}
            setPromoInput={setPromoInput}
            promoError={promoError}
            checkingPromo={checkingPromo}
            renewing={!!current.find((a) => a.formulaId === selected.formula.id && a.state !== "trial")}
            onClose={() => setSelectedId(null)}
            onPromo={() => {
              setPromoError(null);
              startPromo(async () => {
                const result = await checkSubscriptionPromo(promoInput, selected.formula.id, plan);
                if (!("code" in result) || !result.code) {
                  setPromo(null);
                  return setPromoError(result.error ?? "Ce code promo n'est pas valable.");
                }
                setPromo({ code: result.code, discountCents: result.discountCents, key: `${selected.formula.id}:${plan}` });
              });
            }}
            onRemovePromo={() => setPromo(null)}
            onOrder={(total) => {
              setError(null);
              startOrder(async () => {
                const key = `${selected.formula.id}:${plan}`;
                const result = await createSubscriptionOrder(selected.formula.id, plan, waived, total === 0 ? "paypal" : method!, promo?.key === key ? promo.code : undefined);
                if ("needsVerification" in result) setError("Confirme d'abord ton adresse email pour commander.");
                if (gate(result, "/abonnement")) return;
                if (!("ok" in result)) {
                  if ("error" in result) setError(result.error);
                  return;
                }
                router.push(result.paid ? "/compte/plugins" : `/compte/commandes/${result.reference}`);
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Étape de paiement : récapitulatif de la formule choisie, durée, code promo, moyen de paiement. */
function Checkout(props: {
  settings: SubscriptionSettings;
  item: PricingFormula;
  plan: Plan;
  setPlan: (p: Plan) => void;
  available: PayMethod[];
  method: PayMethod | null;
  setMethod: (m: PayMethod) => void;
  waived: boolean;
  setWaived: (v: boolean) => void;
  error: string | null;
  ordering: boolean;
  promo: { code: string; discountCents: number; key: string } | null;
  promoInput: string;
  setPromoInput: (v: string) => void;
  promoError: string | null;
  checkingPromo: boolean;
  renewing: boolean;
  onClose: () => void;
  onPromo: () => void;
  onRemovePromo: () => void;
  onOrder: (total: number) => void;
}) {
  const { settings, item, plan, available, method } = props;
  const f = item.formula;
  const plans = enabledPlans(f);
  const price = planPrice(settings, f, plan);
  const discount = props.promo && props.promo.key === `${f.id}:${plan}` ? props.promo.discountCents : 0;
  const total = price - discount;

  return (
    <section aria-label="Paiement" className="mt-10 grid grid-cols-1 gap-6 rounded-3xl border border-white/15 bg-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Ton choix</p>
            <h3 className="mt-1 font-condensed text-5xl leading-none tracking-tight uppercase">{f.name}</h3>
          </div>
          <button type="button" onClick={props.onClose} className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
            Changer de formule
          </button>
        </div>

        {plans.length > 1 && (
          <div role="radiogroup" aria-label="Durée du pass" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {plans.map((p) => {
              const cents = planPrice(settings, f, p);
              const regular = planSalePrice(settings, f, p) ? planRegularPrice(f, p) : null;
              const saving = p === "year" ? yearlySaving(settings, f) : 0;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={plan === p}
                  onClick={() => props.setPlan(p)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${plan === p ? "border-white bg-white/10" : "border-white/10 hover:border-white/30"}`}
                >
                  <span className="flex items-center justify-between text-sm text-muted">
                    Pass {PLANS[p].label}
                    {saving > 0 && <span className="rounded-full bg-white px-1.5 py-px text-[11px] font-semibold text-black">-{saving} %</span>}
                  </span>
                  <span className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums">{formatPrice(cents)}</span>
                    {regular && <s className="text-sm text-muted tabular-nums">{formatPrice(regular)}</s>}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{planDays(f, p)} jours d&apos;accès</span>
                </button>
              );
            })}
          </div>
        )}

        <ul className="mt-6 space-y-2.5 text-sm text-foreground/85">
          {[
            props.renewing ? "Le pass s'ajoute à la suite de ton accès en cours : tu ne perds aucun jour." : "L'accès s'ouvre dès que ton paiement est vérifié.",
            "Pas de prélèvement automatique : tu prolonges quand tu veux.",
            "Un rappel par email avant la fin de ton accès.",
            `${item.plugins.length} plugin${item.plugins.length > 1 ? "s" : ""}, avec leur clé, dans ton espace.`,
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <Check size={16} className="mt-0.5 shrink-0" /> {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/50 p-5">
        <p className="flex items-baseline justify-between">
          <span className="text-sm text-muted">
            {f.name} · {PLANS[plan].label}
          </span>
          <span className="text-2xl font-bold tracking-tight tabular-nums">{formatPrice(total)}</span>
        </p>
        {discount > 0 && props.promo ? (
          <p className="mt-1 flex items-center justify-between text-sm text-muted">
            <span>
              Code {props.promo.code} : -{formatPrice(discount)}
            </span>
            <button type="button" onClick={props.onRemovePromo} className="underline underline-offset-2 hover:text-foreground">
              Retirer
            </button>
          </p>
        ) : (
          <div className="mt-4">
            <div className="flex gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Code promo</span>
                <input
                  value={props.promoInput}
                  onChange={(e) => props.setPromoInput(e.target.value)}
                  placeholder="Code promo"
                  className="block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm uppercase outline-none placeholder:normal-case placeholder:text-muted focus:border-white/50"
                />
              </label>
              <button
                type="button"
                onClick={props.onPromo}
                disabled={!props.promoInput.trim() || props.checkingPromo}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                Appliquer
              </button>
            </div>
            {props.promoError && (
              <p role="alert" className="mt-2 text-xs text-red-400">
                {props.promoError}
              </p>
            )}
          </div>
        )}

        {total === 0 || available.length > 0 ? (
          <>
            {total > 0 && <PaymentMethodPicker methods={available} value={method} onChange={props.setMethod} totalCents={total} />}
            <label className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-foreground/85">
              <input
                type="checkbox"
                checked={props.waived}
                onChange={(e) => props.setWaived(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-white"
              />
              <span>
                J&apos;accepte les{" "}
                <Link href="/cgv" className="underline underline-offset-2">
                  CGV
                </Link>
                , je demande l&apos;accès aux plugins dès réception du paiement et je renonce à mon droit de rétractation une fois le premier
                téléchargement commencé.
              </span>
            </label>
            {props.error && (
              <p role="alert" className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {props.error}
              </p>
            )}
            <button
              type="button"
              onClick={() => props.onOrder(total)}
              disabled={!props.waived || props.ordering || (total > 0 && !method)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
            >
              {props.ordering && <Loader2 size={16} className="animate-spin" />}
              {total === 0 ? "Valider" : `${props.renewing ? "Prolonger" : "M'abonner"} · ${method ? METHOD_LABELS[method] : ""}`}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {method && isMobileMethod(method) && total > 0
                ? "Tu verras le numéro et le montant exact. Après le paiement, envoie la capture depuis ton espace : l'accès est ouvert dès validation."
                : "Ta commande reçoit une référence à mettre dans ton paiement. L'accès est ouvert dès que le paiement est vérifié."}
            </p>
          </>
        ) : (
          <p className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3.5 text-sm text-muted">
            <Lock size={16} /> Paiement bientôt disponible
          </p>
        )}
      </div>
    </section>
  );
}
