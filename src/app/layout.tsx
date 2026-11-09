import type { Metadata } from "next";
import { Bebas_Neue, Geist, Geist_Mono, Unbounded } from "next/font/google";
import { EmailVerificationPrompt } from "@/components/auth/EmailVerificationPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["700", "800"],
});

// Titre de l'accueil : capitales condensées.
const condensed = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Swell — Plugins VST, AU & sons pour beatmakers",
  description:
    "Plugins Swell (VST3, AU, Standalone) et sons pour beatmakers. Mix, prod et prise de voix à distance sur mix.swell-audio.fr.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${condensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <EmailVerificationPrompt />
      </body>
    </html>
  );
}
