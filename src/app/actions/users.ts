"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

type Result = { error: string } | { ok: true };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanRole = (role: string) => (role === "admin" ? "admin" : "user");

export async function createUserByAdmin(input: { name: string; email: string; role: string }): Promise<Result> {
  await requireAdmin();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { error: "Le nom est obligatoire." };
  if (!EMAIL.test(email)) return { error: "Adresse email invalide." };

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing) return { error: "Un compte existe déjà avec cet email." };

  // Mot de passe aléatoire jamais communiqué : le client choisit le sien grâce au lien envoyé.
  const created = await auth.api.createUser({
    headers: await headers(),
    body: { name, email, password: `${crypto.randomUUID()}-${crypto.randomUUID()}`, data: { emailVerified: true } },
  });
  // Le rôle est réglé après coup : l'inscription l'impose d'après ADMIN_EMAILS.
  await db.update(user).set({ role: cleanRole(input.role), emailVerified: true }).where(eq(user.id, created.user.id));
  await auth.api.requestPasswordReset({ body: { email, redirectTo: "/reinitialiser" } });
  refresh();
  return { ok: true };
}

export async function updateUserByAdmin(
  id: string,
  input: { name: string; email: string; role: string; emailVerified: boolean },
): Promise<Result> {
  const admin = await requireAdmin();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { error: "Le nom est obligatoire." };
  if (!EMAIL.test(email)) return { error: "Adresse email invalide." };
  if (id === admin.id && cleanRole(input.role) !== "admin") return { error: "Tu ne peux pas retirer ton propre rôle d'administrateur." };

  const [taken] = await db.select({ id: user.id }).from(user).where(and(eq(user.email, email), ne(user.id, id)));
  if (taken) return { error: "Un autre compte utilise déjà cet email." };

  await db.update(user).set({ name, email, role: cleanRole(input.role), emailVerified: input.emailVerified }).where(eq(user.id, id));
  refresh();
  return { ok: true };
}

/** Désactive un compte : ses sessions sont fermées et il ne peut plus se connecter. */
export async function setUserDisabled(id: string, disabled: boolean): Promise<Result> {
  const admin = await requireAdmin();
  if (id === admin.id) return { error: "Tu ne peux pas désactiver ton propre compte." };
  const requestHeaders = await headers();
  if (disabled) await auth.api.banUser({ headers: requestHeaders, body: { userId: id, banReason: "Désactivé par l'administrateur" } });
  else await auth.api.unbanUser({ headers: requestHeaders, body: { userId: id } });
  refresh();
  return { ok: true };
}

export async function sendPasswordLinkToUser(id: string): Promise<Result> {
  await requireAdmin();
  const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
  if (!row) return { error: "Compte introuvable." };
  await auth.api.requestPasswordReset({ body: { email: row.email, redirectTo: "/reinitialiser" } });
  return { ok: true };
}

/** Supprime le compte avec ses réservations et ses commandes (suppression en cascade). */
export async function deleteUserByAdmin(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (id === admin.id) return { error: "Tu ne peux pas supprimer ton propre compte." };
  await db.delete(user).where(eq(user.id, id));
  refresh();
  return { ok: true };
}
