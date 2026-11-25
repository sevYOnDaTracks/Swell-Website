import type { Metadata } from "next";

// Page de compte : un titre à elle, et hors des résultats de recherche.
export const metadata: Metadata = { title: "Nouveau mot de passe — Swell", robots: { index: false, follow: true } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
