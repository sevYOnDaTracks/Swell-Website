"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import { user } from "@/db/schema";
import { parsePhoneInput } from "@/lib/phone";
import { requireUser } from "@/lib/session";
import { deleteUpload, saveUpload, UploadError } from "@/lib/storage";

type Result = { error: string } | { ok: true };

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

// Les photos envoyées sont servies par /media ; une photo Google reste une URL externe.
const uploadedName = (image: string | null) => (image?.startsWith("/media/") ? image.slice("/media/".length) : null);

/** Âge en années révolues à une date "YYYY-MM-DD". */
function ageOn(birthDate: string, today: Date) {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

export async function updateProfile(formData: FormData): Promise<Result> {
  const me = await requireUser();

  const name = text(formData, "name");
  if (name.length < 2) return { error: "Indique ton nom (2 caractères minimum)." };

  const parsedPhone = parsePhoneInput(text(formData, "phoneCode"), text(formData, "phone"));
  if ("error" in parsedPhone) return { error: parsedPhone.error };
  const { phone } = parsedPhone;

  const birthDate = text(formData, "birthDate") || null;
  if (birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
      return { error: "Date de naissance invalide." };
    }
    const age = ageOn(birthDate, new Date());
    if (age < 0 || age > 120) return { error: "Date de naissance invalide." };
  }

  const [current] = await db.select({ image: user.image }).from(user).where(eq(user.id, me.id));
  let image = current?.image ?? null;

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    try {
      image = `/media/${await saveUpload(avatar, "image")}`;
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      throw e;
    }
    await deleteUpload(uploadedName(current?.image ?? null));
  } else if (formData.get("removeAvatar") === "on") {
    await deleteUpload(uploadedName(image));
    image = null;
  }

  await db
    .update(user)
    .set({ name: name.slice(0, 80), phone, birthDate, image })
    .where(eq(user.id, me.id));
  refresh();
  return { ok: true };
}

/** Marque le mini tutoriel comme vu : il ne s'affiche plus, sur aucun appareil. */
export async function completeOnboarding() {
  const me = await requireUser();
  await db.update(user).set({ onboardedAt: new Date() }).where(eq(user.id, me.id));
}
