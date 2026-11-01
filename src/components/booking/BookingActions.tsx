"use client";

import { useTransition } from "react";
import { cancelMyBooking, setBookingStatus } from "@/app/actions/booking";
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

export function AdminBookingActions({ id, status }: { id: string; status: BookingStatus }) {
  const [pending, start] = useTransition();
  const set = (s: BookingStatus) => start(() => setBookingStatus(id, s));

  return (
    <div className="flex justify-end gap-2">
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
        <button type="button" disabled={pending} onClick={() => set("cancelled")} className={button}>
          Annuler
        </button>
      )}
    </div>
  );
}
