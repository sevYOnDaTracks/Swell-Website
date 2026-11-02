import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";

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
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
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
