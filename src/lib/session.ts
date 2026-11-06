import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

// Couche d'accès : toute page ou action protégée passe par ces fonctions.
// Elles lisent la requête, donc les composants qui les appellent doivent être
// sous un <Suspense>.

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, image, role, createdAt, emailVerified } = session.user;
  return { id, name, email, image: image ?? null, role: role ?? "user", createdAt, emailVerified };
}

/** Commander, télécharger et réserver demandent une adresse confirmée. Les admins en sont dispensés. */
export function hasConfirmedEmail(user: { role: string; emailVerified: boolean }) {
  return user.emailVerified || user.role === "admin";
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/compte");
  return user;
}
