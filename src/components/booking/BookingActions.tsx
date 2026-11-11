"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { answerProposal, cancelMyBooking, fetchProposalSlots, proposeNewSlot, setBookingPaid, setBookingStatus } from "@/app/actions/booking";
import type { BookingStatus } from "@/db/schema";

const button =
  "rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 disabled:opacity-40";

export function CancelMyBookingButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={button}
      onClick={() => {
        if (confirm("Annuler cette réservation ?")) start(() => cancelMyBooking(id));
      }}
    >
      Annuler
    </button>
  );
}

export function AdminBookingActions({ id, status, today }: { id: string; status: BookingStatus; today: string }) {
  const [pending, start] = useTransition();
  const [proposing, setProposing] = useState(false);
  const set = (s: BookingStatus) => start(() => setBookingStatus(id, s));

  if (proposing) return <ProposeSlotForm id={id} today={today} onClose={() => setProposing(false)} />;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {status !== "confirmed" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => set("confirmed")}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-40"
        >
          Confirmer
        </button>
      )}
      {status !== "cancelled" && (
        <button type="button" disabled={pending} onClick={() => setProposing(true)} className={`${button} inline-flex items-center gap-1.5`}>
          <CalendarClock size={13} /> {status === "proposed" ? "Proposer un autre" : "Proposer un créneau"}
        </button>
      )}
      {status !== "cancelled" && (
        <button type="button" disabled={pending} onClick={() => set("cancelled")} className={button}>
          Annuler
        </button>
      )}
    </div>
  );
}

/** Choix d'un autre créneau libre à proposer au client, avec un message facultatif. */
function ProposeSlotForm({ id, today, onClose }: { id: string; today: string; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [sending, startSending] = useTransition();

  function pickDate(value: string) {
    setDate(value);
    setTime("");
    setSlots(null);
    if (value) startLoading(async () => setSlots(await fetchProposalSlots(id, value)));
  }

  function send() {
    setError(null);
    startSending(async () => {
      const result = await proposeNewSlot({ id, date, startTime: time, note });
      if ("error" in result) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="w-full space-y-3 rounded-xl border border-white/10 bg-background/40 p-4 sm:w-80">
      <p className="text-sm font-medium">Proposer un autre créneau</p>
      <input
        type="date"
        min={today}
        value={date}
        onChange={(e) => pickDate(e.target.value)}
        aria-label="Date proposée"
        className="block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm [color-scheme:dark]"
      />
      {loading && <Loader2 size={16} className="animate-spin text-muted" />}
      {slots && slots.length === 0 && <p className="text-xs text-muted">Aucun créneau libre ce jour-là.</p>}
      {slots && slots.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Heure proposée">
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={time === s}
              onClick={() => setTime(s)}
              className={`rounded-md border px-2.5 py-1 text-xs tabular-nums transition-colors ${
                time === s ? "border-white bg-white text-black" : "border-white/10 hover:bg-white/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Message pour le client (facultatif)"
        className="block w-full resize-none rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm placeholder:text-muted/50"
      />
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={button}>
          Retour
        </button>
        <button
          type="button"
          disabled={!date || !time || sending}
          onClick={send}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-40"
        >
          Envoyer au client
        </button>
      </div>
    </div>
  );
}

/** Réponse du client à un créneau proposé par l'admin. */
export function ProposalAnswer({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const answer = (accept: boolean) =>
    start(async () => {
      const result = await answerProposal(id, accept);
      if ("error" in result) setError(result.error);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => answer(true)}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-40"
      >
        Accepter
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Refuser ce créneau ? Ta réservation sera annulée.")) answer(false);
        }}
        className={button}
      >
        Refuser
      </button>
      {error && <p className="w-full text-xs text-red-300">{error}</p>}
    </div>
  );
}

/** Paiement d'une séance à prix fixe, vu par l'admin : montant, moyen, référence, et bascule « payée ». */
export function AdminBookingPayment({
  id,
  price,
  method,
  reference,
  paid,
}: {
  id: string;
  price: string;
  method: string | null;
  reference: string | null;
  paid: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${paid ? "bg-white text-black" : "border border-dashed border-white/40 text-foreground"}`}>
        {paid ? "Payée" : "À payer"}
      </span>
      <span className="text-muted">
        {price}
        {method && ` · ${method}`}
        {reference && (
          <>
            {" · "}
            <span className="font-mono">{reference}</span>
          </>
        )}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (paid ? confirm("Repasser cette séance en « À payer » ?") : true) start(() => setBookingPaid(id, !paid));
        }}
        className={button}
      >
        {paid ? "Annuler le paiement" : "Marquer payée"}
      </button>
    </div>
  );
}
