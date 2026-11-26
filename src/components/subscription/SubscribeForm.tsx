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
import { enabledPlans, PLANS, planDays, planPrice, planRegularPrice, planSalePrice, yearlySaving, type Plan, type SubscriptionSettings } from "@/lib/subscription-plans";

export type Viewer = {
  loggedIn: boolean;
  // État de l'abonnement du client connecté.
  state: "none" | "trial" | "active" | "grace" | "expired";
  trialUsed: boolean;
  // Fin de l'accès déjà formatée (« 12 décembre 2026 »), si le client a eu un abonnement.
  endsLabel: string | null;
};

const errorBox = "mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300";

/** Essai gratuit, choix de la formule, code promo et paiement d'un pass Swell All Access. */
export function SubscribeForm({ settings, payments, viewer }: { settings: SubscriptionSettings; payments: PaymentOptions; viewer: Viewer }) {
  const router = useRouter();
  const available = METHOD_ORDER.filter((m) => payments[m]);
  const plans = enabledPlans(settings);
  const [plan, setPlan] = useState<Plan>(plans[0] ?? "month");
  const [method, setMethod] = useState<PayMethod | null>(available[0] ?? null);
  const [waived, setWaived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountCents: number; plan: Plan } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [ordering, startOrder] = useTransition();
  const [checkingPromo, startPromo] = useTransition();
  const [startingTrial, startTrial] = useTransition();

  const price = planPrice(settings, plan);
  // La remise d'un code dépend de la formule : changer de formule la recalcule.
  const discount = promo && promo.plan === plan ? promo.discountCents : 0;
  const total = price - discount;
  const saving = yearlySaving(settings);
  const saleEndLabel = settings.saleEndsAt
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(settings.saleEndsAt))
    : null;
  const canTrial = settings.trialDays > 0 && !viewer.trialUsed && viewer.state === "none";
  // Abonné en cours (ou dans la marge) : le pass prolonge. Pendant l'essai, il commence à la fin de l'essai.
  const renewing = viewer.state === "active" || viewer.state === "grace";
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
      const result = await checkSubscriptionPromo(promoInput, plan);
      if (!("code" in result) || !result.code) {
        setPromo(null);
        return setPromoError(result.error ?? "Ce code promo n'est pas valable.");
      }
      setPromo({ code: result.code, discountCents: result.discountCents, plan });
    });
  }

  function order() {
    setError(null);
    startOrder(async () => {
      const result = await createSubscriptionOrder(plan, waived, total === 0 ? "paypal" : method!, promo?.plan === plan ? promo.code : undefined);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {canTrial && (
          <div className="rounded-2xl border border-white/20 bg-white/[0.04] p-5">
            <p className="flex items-center gap-2 font-semibold">
              <FlaskConical size={18} /> {settings.trialDays} jours gratuits sur toute la gamme
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

        {viewer.state === "trial" && viewer.endsLabel && (
          <p className="rounded-2xl border border-white/10 bg-surface px-5 py-4 text-sm">
            Ton essai gratuit court jusqu&apos;au <strong>{viewer.endsLabel}</strong>. Un pass pris maintenant commence à la fin de
            l&apos;essai : tu ne perds aucun jour.
          </p>
        )}

        {renewing && viewer.endsLabel && (
          <p className="rounded-2xl border border-white/10 bg-surface px-5 py-4 text-sm">
            {viewer.state === "grace" ? (
              <>Ton accès est arrivé à son terme le <strong>{viewer.endsLabel}</strong> : renouvelle-le pour garder tes plugins actifs.</>
            ) : (
              <>
                Ton accès court jusqu&apos;au <strong>{viewer.endsLabel}</strong>. Un nouveau pass s&apos;ajoute à la suite : tu ne perds aucun jour.
              </>
            )}
          </p>
        )}

        <fieldset>
          <legend className="text-sm font-medium">{renewing ? "Prolonger avec" : "Choisis ta formule"}</legend>
          <div role="radiogroup" className={`mt-2 grid gap-3 ${plans.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {plans.map((p) => {
              const selected = plan === p;
              const cents = planPrice(settings, p);
              const regular = planSalePrice(settings, p) ? planRegularPrice(settings, p) : null;
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
                  {p === "year" && saving > 0 && (
                    <span className="absolute right-4 top-4 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">-{saving} %</span>
                  )}
                  <p className="text-sm text-muted">Pass {PLANS[p].label}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-3xl font-bold tracking-tight">{formatPrice(cents)}</span>
                    {regular && <s className="text-base text-muted">{formatPrice(regular)}</s>}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {planDays(settings, p)} jours d&apos;accès
                    {planDays(settings, p) >= 60 ? ` · soit ${formatPrice(Math.round((cents * 30) / planDays(settings, p)))} par mois` : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </fieldset>

        <ul className="grid gap-2 text-sm text-foreground/85 sm:grid-cols-2">
          {[
            "Tous les plugins Swell, nouveautés comprises",
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
          Pass {PLANS[plan].label}
          {saleEndLabel && planSalePrice(settings, plan) ? ` · prix promo jusqu'au ${saleEndLabel}` : ""}
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
  );
}
