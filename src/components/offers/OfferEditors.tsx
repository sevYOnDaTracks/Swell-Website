"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { deletePlan, deleteService, movePlan, moveService, savePlan, saveService } from "@/app/actions/offers";
import { SERVICE_ICONS, serviceIcon } from "@/lib/offer-icons";
import { formatPrice } from "@/lib/shop-format";

export type ServiceRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  durationMinutes: number;
  priceCents: number | null;
  bookable: boolean;
  visible: boolean;
};

export type PlanRow = {
  id: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  features: string[];
  highlighted: boolean;
  serviceId: string | null;
  visible: boolean;
};

type Result = { error: string } | { ok: true };

const input =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-white/50 focus:ring-2 focus:ring-white/10 [color-scheme:dark]";
const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-30";

/** Ligne d'une liste : résumé + boutons, ou formulaire d'édition une fois ouverte. */
function EditableRow({
  summary,
  form,
  editing,
  setEditing,
  onMove,
  onDelete,
  isFirst,
  isLast,
}: {
  summary: React.ReactNode;
  form: React.ReactNode;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onMove: (d: -1 | 1) => Promise<Result>;
  onDelete: () => Promise<Result>;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<Result>) =>
    start(async () => {
      const result = await action();
      setError("error" in result ? result.error : null);
    });

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">{summary}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" className={iconButton} disabled={pending || isFirst} onClick={() => run(() => onMove(-1))} aria-label="Monter">
            <ChevronUp size={15} />
          </button>
          <button type="button" className={iconButton} disabled={pending || isLast} onClick={() => run(() => onMove(1))} aria-label="Descendre">
            <ChevronDown size={15} />
          </button>
          <button type="button" className={iconButton} onClick={() => setEditing(!editing)} aria-label={editing ? "Fermer" : "Modifier"}>
            {editing ? <X size={15} /> : <Pencil size={15} />}
          </button>
          <button
            type="button"
            className={iconButton}
            disabled={pending}
            onClick={() => {
              if (confirm("Supprimer définitivement ?")) run(onDelete);
            }}
            aria-label="Supprimer"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      {editing && <div className="mt-4">{form}</div>}
    </li>
  );
}

function EditorForm({
  action,
  onDone,
  submitLabel,
  children,
}: {
  action: (formData: FormData) => Promise<Result>;
  onDone: () => void;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        start(async () => {
          const result = await action(formData);
          if ("error" in result) return setError(result.error);
          setError(null);
          onDone();
        });
      }}
      className="space-y-4 rounded-xl border border-white/10 bg-background/40 p-4"
    >
      {children}
      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {submitLabel}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
          Annuler
        </button>
      </div>
    </form>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-white" />
      {label}
    </label>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
    >
      <Plus size={16} /> {children}
    </button>
  );
}

// --- Services ---------------------------------------------------------------

function ServiceFields({ s }: { s?: ServiceRow }) {
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-4 sm:grid-cols-[1fr_160px_120px_120px]">
        <label className="block text-sm font-medium">
          Nom
          <input name="name" required defaultValue={s?.name} placeholder="Mixing & Mastering" className={input} />
        </label>
        <label className="block text-sm font-medium">
          Icône
          <select name="icon" defaultValue={s?.icon ?? "sliders"} className={input}>
            {Object.entries(SERVICE_ICONS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Durée (min)
          <input name="duration" type="number" min={15} max={600} step={15} required defaultValue={s?.durationMinutes ?? 60} className={input} />
        </label>
        <label className="block text-sm font-medium">
          Prix (€)
          <input
            name="price"
            inputMode="decimal"
            defaultValue={s?.priceCents ? String(s.priceCents / 100).replace(".", ",") : ""}
            placeholder="Sur devis"
            className={input}
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Description
        <textarea name="description" rows={2} maxLength={300} defaultValue={s?.description} className={`${input} resize-y`} />
      </label>
      <div className="flex flex-wrap gap-5">
        <Check name="visible" label="Affiché sur l'accueil" defaultChecked={s?.visible ?? true} />
        <Check name="bookable" label="Réservable en ligne" defaultChecked={s?.bookable ?? true} />
      </div>
    </>
  );
}

export function ServicesEditor({ services }: { services: ServiceRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <AddButton onClick={() => setEditing("new")}>Nouveau service</AddButton>
      </div>
      {editing === "new" && (
        <div className="mb-4">
          <EditorForm action={saveService} onDone={() => setEditing(null)} submitLabel="Créer le service">
            <ServiceFields />
          </EditorForm>
        </div>
      )}
      <ul className="divide-y divide-white/5">
        {services.map((s, i) => {
          const Icon = serviceIcon(s.icon);
          return (
            <EditableRow
              key={s.id}
              editing={editing === s.id}
              setEditing={(v) => setEditing(v ? s.id : null)}
              onMove={(d) => moveService(s.id, d)}
              onDelete={() => deleteService(s.id)}
              isFirst={i === 0}
              isLast={i === services.length - 1}
              summary={
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs text-muted">
                      {s.durationMinutes} min · {s.priceCents ? formatPrice(s.priceCents) : "sur devis"}
                      {s.bookable ? " · réservable" : ""}
                      {s.visible ? "" : " · masqué"}
                    </p>
                  </div>
                </div>
              }
              form={
                <EditorForm action={saveService} onDone={() => setEditing(null)} submitLabel="Enregistrer">
                  <ServiceFields s={s} />
                </EditorForm>
              }
            />
          );
        })}
      </ul>
    </>
  );
}

// --- Tarifs -----------------------------------------------------------------

function PlanFields({ p, services }: { p?: PlanRow; services: ServiceRow[] }) {
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Nom
          <input name="name" required defaultValue={p?.name} placeholder="Mix + Master" className={input} />
        </label>
        <label className="block text-sm font-medium">
          Prix
          <input name="price" required defaultValue={p?.price} placeholder="119 € ou Sur devis" className={input} />
        </label>
        <label className="block text-sm font-medium">
          Unité
          <input name="unit" defaultValue={p?.unit} placeholder="/ titre" className={input} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Description
        <input name="description" maxLength={200} defaultValue={p?.description} placeholder="Le pack complet, prêt à sortir." className={input} />
      </label>
      <label className="block text-sm font-medium">
        Ce qui est inclus <span className="font-normal text-muted">(une ligne par point)</span>
        <textarea name="features" rows={4} defaultValue={p?.features.join("\n")} placeholder={"Mastering streaming\n3 révisions"} className={`${input} resize-y`} />
      </label>
      <label className="block text-sm font-medium">
        Bouton « Réserver » vers
        <select name="serviceId" defaultValue={p?.serviceId ?? ""} className={input}>
          <option value="">Page de réservation (sans service présélectionné)</option>
          {services
            .filter((s) => s.bookable)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-5">
        <Check name="visible" label="Affiché sur l'accueil" defaultChecked={p?.visible ?? true} />
        <Check name="highlighted" label="Mis en avant (« Le plus demandé »)" defaultChecked={p?.highlighted ?? false} />
      </div>
    </>
  );
}

export function PlansEditor({ plans, services }: { plans: PlanRow[]; services: ServiceRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <AddButton onClick={() => setEditing("new")}>Nouveau tarif</AddButton>
      </div>
      {editing === "new" && (
        <div className="mb-4">
          <EditorForm action={savePlan} onDone={() => setEditing(null)} submitLabel="Créer le tarif">
            <PlanFields services={services} />
          </EditorForm>
        </div>
      )}
      <ul className="divide-y divide-white/5">
        {plans.map((p, i) => (
          <EditableRow
            key={p.id}
            editing={editing === p.id}
            setEditing={(v) => setEditing(v ? p.id : null)}
            onMove={(d) => movePlan(p.id, d)}
            onDelete={() => deletePlan(p.id)}
            isFirst={i === 0}
            isLast={i === plans.length - 1}
            summary={
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{p.name}</span>
                  {p.highlighted && <Star size={13} className="shrink-0 fill-white" aria-label="Mis en avant" />}
                </p>
                <p className="text-xs text-muted">
                  {p.price} {p.unit}
                  {p.visible ? "" : " · masqué"}
                </p>
              </div>
            }
            form={
              <EditorForm action={savePlan} onDone={() => setEditing(null)} submitLabel="Enregistrer">
                <PlanFields p={p} services={services} />
              </EditorForm>
            }
          />
        ))}
      </ul>
    </>
  );
}
