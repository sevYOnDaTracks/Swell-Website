import { Suspense } from "react";
import { connection } from "next/server";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CartView } from "@/components/cart/CartView";
import { getPaypalEmail, getTransferDetails } from "@/lib/orders";

export const metadata = { title: "Panier — Swell" };

export default function CartPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-24 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Ton panier</h1>
          <Suspense fallback={<div className="mt-10 h-40 animate-pulse rounded-2xl border border-white/5 bg-surface" />}>
            <CartContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

async function CartContent() {
  // Lu à chaque visite : les paiements s'ouvrent en réglant le serveur, sans nouveau build.
  await connection();
  return <CartView transferOpen={!!getTransferDetails()} paypalOpen={!!getPaypalEmail()} />;
}
