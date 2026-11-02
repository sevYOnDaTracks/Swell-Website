"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Clock, Hand, MonitorSmartphone, Settings, X } from "lucide-react";
import { completeOnboarding } from "@/app/actions/profile";

const STEPS = [
  {
    Icon: Hand,
    title: "Bienvenue sur Swell",
    text: "Voici ton espace en 30 secondes : comment réserver, suivre tes sessions et préparer ton ordinateur.",
  },
  {
    Icon: CalendarPlus,
    title: "Réserve une session",
    text: "Choisis un service, une date et un créneau. Ta réservation passe en « Confirmée » dès que je l'ai validée, et tu reçois un rappel par email la veille.",
  },
  {
    Icon: Clock,
    title: "Suis tes réservations",
    text: "Dans Mon espace, l'onglet « À venir » liste tes prochaines sessions (tu peux les annuler) et « Archivées » garde l'historique.",
  },
  {
    Icon: MonitorSmartphone,
    title: "Prise en main à distance",
    text: "Pour une installation de plugins, installe AnyDesk avant la session : les liens de téléchargement sont dans ton espace.",
  },
  {
    Icon: Settings,
    title: "Complète ton profil",
    text: "Ajoute ton téléphone et une photo dans Mon profil, pour que je puisse te joindre le jour de ta session.",
  },
];

/** Mini tutoriel affiché une seule fois, à la première visite de l'espace. */
export function OnboardingTour({ firstName }: { firstName: string }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const last = step === STEPS.length - 1;
  const { Icon, title, text } = STEPS[step];

  function close() {
    setOpen(false);
    void completeOnboarding();
  }

  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          {step === 0 ? `Salut ${firstName}` : `Étape ${step} sur ${STEPS.length - 1}`}
        </p>
        <h2 id="onboarding-title" className="mt-2 text-xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>

        <div className="mt-6 flex items-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
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
                href="/compte/profil"
                onClick={close}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
              >
                Compléter mon profil
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
