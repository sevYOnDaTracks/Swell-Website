"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AudioLines, CalendarPlus, Clock, FlaskConical, Hand, KeyRound, MonitorSmartphone, Plug, Settings, ShoppingCart, X } from "lucide-react";
import { completeOnboarding } from "@/app/actions/profile";
import type { Site } from "@/lib/sites";

type Step = { Icon: typeof Hand; title: string; text: string };

// Un tutoriel par site : beatmakers sur la boutique, artistes sur mix.swell-audio.fr.
const STEPS: Record<Site, Step[]> = {
  shop: [
    {
      Icon: Hand,
      title: "Bienvenue sur Swell",
      text: "Voici ton espace en 30 secondes : tes plugins, leurs licences, les essais gratuits et ton panier.",
    },
    {
      Icon: Plug,
      title: "Retrouve tes plugins",
      text: "Après l'achat, chaque plugin arrive dans « Mes plugins » (l'icône prise du menu) : téléchargement Windows et Mac, et ta clé de licence.",
    },
    {
      Icon: KeyRound,
      title: "Active ton plugin",
      text: "Au premier lancement, colle ta clé dans le plugin. Internet ne sert qu'une fois, ensuite il marche hors ligne, sur 3 ordinateurs. Tu peux retirer un ordinateur depuis « Mes plugins ».",
    },
    {
      Icon: FlaskConical,
      title: "Essaie avant d'acheter",
      text: "Sur certains plugins, le bouton « Essayer » de la fiche te donne une clé d'essai. Si tu l'achètes ensuite, la même clé devient définitive : rien à réinstaller.",
    },
    {
      Icon: ShoppingCart,
      title: "Ajoute, commande, télécharge",
      text: "Ajoute un plugin depuis la boutique avec l'icône panier, puis commande depuis le panier sur le côté. Tes fichiers et ta clé arrivent dès que le paiement est vérifié.",
    },
  ],
  mix: [
    {
      Icon: Hand,
      title: "Bienvenue sur Swell Mix",
      text: "Voici ton espace en 30 secondes : comment réserver, suivre tes sessions, préparer ton ordinateur et trouver une prod.",
    },
    {
      Icon: CalendarPlus,
      title: "Réserve une session",
      text: "Mix, prod, reprod ou prise de voix : choisis un service, une date et un créneau. Ta réservation passe en « Confirmée » dès que je l'ai validée, et tu reçois un rappel par email la veille.",
    },
    {
      Icon: Clock,
      title: "Suis tes réservations",
      text: "Dans Mon espace, l'onglet « À venir » liste tes prochaines sessions (tu peux les annuler) et « Archivées » garde l'historique.",
    },
    {
      Icon: MonitorSmartphone,
      title: "Prise en main à distance",
      text: "Pour une installation de plugins ou une aide sur ton ordinateur, installe AnyDesk avant la session : les liens de téléchargement sont dans ton espace.",
    },
    {
      Icon: AudioLines,
      title: "Trouve ta prod",
      text: "Dans « Instrumentales », écoute les extraits et ajoute une prod au panier pour poser ta voix dessus.",
    },
    {
      Icon: Settings,
      title: "Complète ton profil",
      text: "Ajoute ton téléphone et une photo dans Mon profil, pour que je puisse te joindre le jour de ta session.",
    },
  ],
};

const FINAL_ACTION: Record<Site, { href: string; label: string }> = {
  shop: { href: "/boutique?type=vst", label: "Voir les plugins" },
  mix: { href: "/compte/profil", label: "Compléter mon profil" },
};

/** Mini tutoriel affiché une seule fois par site, à la première visite de l'espace. */
export function OnboardingTour({ firstName, site }: { firstName: string; site: Site }) {
  const steps = STEPS[site];
  const action = FINAL_ACTION[site];
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const last = step === steps.length - 1;
  const { Icon, title, text } = steps[step];

  function close() {
    setOpen(false);
    void completeOnboarding(site);
  }

  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close et steps ne changent pas pendant que le tutoriel est ouvert (le site ne change pas).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl shadow-black/60 outline-none sm:p-7"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fermer le tutoriel"
          className="absolute top-4 right-4 rounded-md p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <X size={18} />
        </button>

        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-black">
          <Icon size={22} />
        </span>
        <p className="mt-5 text-xs font-medium uppercase tracking-widest text-muted">
          {step === 0 ? `Salut ${firstName}` : `Étape ${step} sur ${steps.length - 1}`}
        </p>
        <h2 id="onboarding-title" className="mt-2 text-xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>

        <div className="mt-6 flex items-center gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-white" : "w-1.5 bg-white/20"}`} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="text-sm text-muted hover:text-foreground">
              Précédent
            </button>
          ) : (
            <button type="button" onClick={close} className="text-sm text-muted hover:text-foreground">
              Passer
            </button>
          )}
          {last ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={close} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
                Plus tard
              </button>
              <Link
                href={action.href}
                onClick={close}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                {action.label}
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
            >
              {step === 0 ? "C'est parti" : "Suivant"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
