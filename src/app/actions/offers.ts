"use server";

import { asc, eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { db } from "@/db";
import { booking, plan, service } from "@/db/schema";
import { SERVICE_ICONS } from "@/lib/offer-icons";
import { OFFERS_TAG } from "@/lib/offers";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/shop";

type Result = { error: string } | { ok: true };

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const checked = (formData: FormData, key: string) => formData.get(key) === "on";

function done(): Result {
  updateTag(OFFERS_TAG);
  refresh();
  return { ok: true };
}

// --- Services ---------------------------------------------------------------

export async function saveService(formData: FormData): Promise<Result> {
  await requireAdmin();

  const id = text(formData, "id");
  const name = text(formData, "name");
  const icon = text(formData, "icon");
  const duration = Number(text(formData, "duration"));

  if (!name) return { error: "Le nom est obligatoire." };
  if (!(icon in SERVICE_ICONS)) return { error: "Icône invalide." };
  if (!Number.isInteger(duration) || duration < 15 || duration > 600 || duration % 15 !== 0) {
    return { error: "Durée invalide : entre 15 et 600 minutes, par tranches de 15." };
  }

  const values = {
    name,
    description: text(formData, "description").slice(0, 300),
    icon,
    durationMinutes: duration,
    bookable: checked(formData, "bookable"),
    visible: checked(formData, "visible"),
  };

  if (id) {
    await db.update(service).set(values).where(eq(service.id, id));
  } else {
    const newId = slugify(name);
    if (!newId) return { error: "Nom invalide." };
    const [existing] = await db.select({ id: service.id }).from(service).where(eq(service.id, newId));
    if (existing) return { error: "Un service porte déjà ce nom." };
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${service.position}), -1)` }).from(service);
    await db.insert(service).values({ id: newId, position: max + 1, ...values });
  }
  return done();
}

export async function deleteService(id: string): Promise<Result> {
  await requireAdmin();
  const [used] = await db.select({ id: booking.id }).from(booking).where(eq(booking.service, id)).limit(1);
  if (used) {
    return { error: "Ce service a déjà des réservations : décoche « Réservable » et « Affiché » plutôt que de le supprimer." };
  }
  await db.delete(service).where(eq(service.id, id));
  return done();
}

export async function moveService(id: string, direction: -1 | 1): Promise<Result> {
  await requireAdmin();
  await swapPositions(await db.select({ id: service.id, position: service.position }).from(service).orderBy(asc(service.position)), id, direction, (rowId, position) =>
    db.update(service).set({ position }).where(eq(service.id, rowId)),
  );
  return done();
}

// --- Tarifs -----------------------------------------------------------------

export async function savePlan(formData: FormData): Promise<Result> {
  await requireAdmin();

  const id = text(formData, "id");
  const name = text(formData, "name");
  const price = text(formData, "price");
  if (!name) return { error: "Le nom est obligatoire." };
  if (!price) return { error: "Le prix est obligatoire (ex : 79 € ou Sur devis)." };

  const serviceId = text(formData, "serviceId") || null;
  if (serviceId) {
    const [exists] = await db.select({ id: service.id }).from(service).where(eq(service.id, serviceId));
    if (!exists) return { error: "Service lié introuvable." };
  }

  const values = {
    name,
    price: price.slice(0, 40),
    unit: text(formData, "unit").slice(0, 40),
    description: text(formData, "description").slice(0, 200),
    features: text(formData, "features")
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, 12),
    highlighted: checked(formData, "highlighted"),
    visible: checked(formData, "visible"),
    serviceId,
  };

  if (id) {
    await db.update(plan).set(values).where(eq(plan.id, id));
  } else {
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${plan.position}), -1)` }).from(plan);
    await db.insert(plan).values({ position: max + 1, ...values });
  }
  return done();
}

export async function deletePlan(id: string): Promise<Result> {
  await requireAdmin();
  await db.delete(plan).where(eq(plan.id, id));
  return done();
}

export async function movePlan(id: string, direction: -1 | 1): Promise<Result> {
  await requireAdmin();
  await swapPositions(await db.select({ id: plan.id, position: plan.position }).from(plan).orderBy(asc(plan.position)), id, direction, (rowId, position) =>
    db.update(plan).set({ position }).where(eq(plan.id, rowId)),
  );
  return done();
}

async function swapPositions(
  rows: { id: string; position: number }[],
  id: string,
  direction: -1 | 1,
  setPosition: (id: string, position: number) => Promise<unknown>,
) {
  const index = rows.findIndex((r) => r.id === id);
  const other = rows[index + direction];
  if (index === -1 || !other) return;
  // Renumérote proprement puis échange les deux voisins.
  const ordered = rows.map((r) => r.id);
  [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
  await Promise.all(ordered.map((rowId, position) => setPosition(rowId, position)));
}
