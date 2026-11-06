"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Clock, Loader2 } from "lucide-react";
import { createBooking, fetchSlots } from "@/app/actions/booking";
import { askEmailVerification } from "@/components/auth/EmailVerificationPrompt";

type Service = { id: string; label: string; duration: number; description: string };
type Day = { date: string; open: boolean };

const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

const formatDuration = (min: number) =>
  min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min / 60}h`;

export function BookingForm({
  services,
  days,
  initialService,
}: {
  services: Service[];
  days: Day[];
  initialService?: string;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(initialService ?? services[0].id);
  const [date, setDate] = useState(days.find((d) => d.open)?.date ?? "");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, startLoadingSlots] = useTransition();
  const [submitting, startSubmitting] = useTransition();

  const service = services.find((s) => s.id === serviceId)!;

  useEffect(() => {
    if (!date) return;
    startLoadingSlots(async () => {
      setTime(null);
      setSlots(await fetchSlots(serviceId, date));
    });
  }, [serviceId, date]);

  function submit() {
    if (!time) return;
    setError(null);
    startSubmitting(async () => {
      const result = await createBooking({ serviceId, date, startTime: time, notes });
      if ("error" in result) {
        setError(result.error);
        if (result.needsVerification) askEmailVerification();
        setSlots(await fetchSlots(serviceId, date));
        setTime(null);
        return;
      }
      router.push("/compte?reservation=ok");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-8">
        <Step n={1} title="Service">
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                aria-pressed={s.id === serviceId}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  s.id === serviceId ? "border-white bg-white/[0.06]" : "border-white/10 hover:border-white/30"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.label}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Clock size={12} /> {formatDuration(s.duration)}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-muted">{s.description}</span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Date">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {days.map((d) => {
              const selected = d.date === date;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={!d.open}
                  onClick={() => setDate(d.date)}
                  aria-pressed={selected}
                  className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                    selected ? "border-white bg-white text-black" : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <span className={`text-xs capitalize ${selected ? "text-black/60" : "text-muted"}`}>
                    {dayName.format(asDate(d.date)).replace(".", "")}
                  </span>
                  <span className="text-lg font-semibold leading-tight">{asDate(d.date).getUTCDate()}</span>
                  <span className={`text-xs ${selected ? "text-black/60" : "text-muted"}`}>
                    {dayMonth.format(asDate(d.date)).replace(".", "")}
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={3} title="Créneau">
          {loadingSlots || slots === null ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" /> Chargement des créneaux…
            </p>
          ) : slots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-muted">
              Plus de créneau libre ce jour-là pour ce service. Essaie une autre date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTime(s)}
                  aria-pressed={s === time}
                  className={`rounded-lg border py-2.5 text-sm font-medium tabular-nums transition-colors ${
                    s === time ? "border-white bg-white text-black" : "border-white/10 hover:border-white/30"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </Step>

        <Step n={4} title="Infos pour la session (optionnel)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Lien vers tes pistes, références, BPM, ce que tu attends de la session…"
            className="block w-full resize-y rounded-xl border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-white/50 focus:ring-2 focus:ring-white/10"
          />
        </Step>
      </div>

      <aside className="h-fit rounded-2xl border border-white/10 bg-surface p-6 lg:sticky lg:top-6">
        <h2 className="font-semibold">Récapitulatif</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Service" value={service.label} />
          <Row label="Durée" value={formatDuration(service.duration)} />
          <Row label="Date" value={date ? fullDate.format(asDate(date)) : "—"} capitalize />
          <Row label="Heure" value={time ?? "—"} />
        </dl>
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!time || submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Confirmer la réservation
        </button>
        <p className="mt-3 text-xs text-muted">
          Ta demande sera confirmée par Swell. Tu peux l&apos;annuler depuis ton espace.
        </p>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-3 font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 font-mono text-xs">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right font-medium ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
