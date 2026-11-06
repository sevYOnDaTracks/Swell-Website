import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "./email";

// Les emails listés dans ADMIN_EMAILS reçoivent le rôle admin à l'inscription.
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  // Le site répond aussi sur www : sans ça, la connexion y est refusée (INVALID_ORIGIN).
  trustedOrigins: ["https://swell-audio.fr", "https://www.swell-audio.fr"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Réinitialise ton mot de passe Swell",
        title: "Nouveau mot de passe",
        paragraphs: [
          `Salut ${user.name.split(" ")[0]},`,
          "Tu as demandé à changer ton mot de passe. Clique sur le bouton ci-dessous pour en choisir un nouveau. Le lien est valable 1 heure.",
          "Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.",
        ],
        cta: { label: "Choisir un nouveau mot de passe", href: url },
      });
    },
  },
  // Les comptes Google arrivent déjà confirmés par Google. La connexion reste possible avant
  // confirmation : ce sont les actions (commander, télécharger, réserver) qui l'exigent.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirme ton adresse email Swell",
        title: "Confirme ton adresse email",
        paragraphs: [
          `Salut ${user.name.split(" ")[0]},`,
          "Clique sur le bouton ci-dessous pour confirmer ton adresse. Tu pourras ensuite commander, télécharger et réserver. Le lien est valable 24 heures.",
          "Si tu n'as pas créé de compte Swell, ignore simplement cet email.",
        ],
        cta: { label: "Confirmer mon adresse", href: url },
      });
    },
  },
  // Google n'est activé que si les identifiants sont présents dans .env.local.
  socialProviders: google ? { google } : {},
  account: {
    // Un client inscrit par email peut ensuite se connecter avec Google (même adresse).
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  plugins: [admin()],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            role: adminEmails.includes(user.email.toLowerCase()) ? "admin" : "user",
          },
        }),
      },
    },
  },
});
