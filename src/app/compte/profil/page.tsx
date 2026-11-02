import Link from "next/link";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { Card, DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { PasswordForm } from "@/components/profile/PasswordForm";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { db } from "@/db";
import { account, user as userTable } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Mon profil — Swell" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default function ProfilePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const me = await requireUser();
  const [[profile], credential] = await Promise.all([
    db
      .select({
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
        phone: userTable.phone,
        birthDate: userTable.birthDate,
      })
      .from(userTable)
      .where(eq(userTable.id, me.id)),
    db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, me.id), eq(account.providerId, "credential"))),
  ]);

  return (
    <DashboardShell user={me} title="Mon profil" subtitle="Tes informations et la sécurité de ton compte.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Informations personnelles">
            <ProfileForm profile={profile} />
          </Card>

          <Card title="Mot de passe">
            {credential.length > 0 ? (
              <PasswordForm />
            ) : (
              <p className="text-sm text-muted">
                Tu te connectes avec Google, sans mot de passe Swell. Pour en créer un, utilise{" "}
                <Link href="/mot-de-passe-oublie" className="text-foreground underline underline-offset-4">
                  Mot de passe oublié
                </Link>{" "}
                avec ton adresse email.
              </p>
            )}
          </Card>
        </div>

        <Card title="Mon compte">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted">Type de compte</dt>
              <dd className="mt-0.5 font-medium">{me.role === "admin" ? "Administrateur" : "Client"}</dd>
            </div>
            <div>
              <dt className="text-muted">Membre depuis le</dt>
              <dd className="mt-0.5 font-medium">{dateFormat.format(me.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted">Connexion</dt>
              <dd className="mt-0.5 font-medium">{credential.length > 0 ? "Email et mot de passe" : "Google"}</dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-muted">
            Pour changer d&apos;adresse email ou supprimer ton compte, écris-moi depuis la page{" "}
            <Link href="/confidentialite" className="underline underline-offset-4 hover:text-foreground">
              confidentialité
            </Link>
            .
          </p>
        </Card>
      </div>
    </DashboardShell>
  );
}
