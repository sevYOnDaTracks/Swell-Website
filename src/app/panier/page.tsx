import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CartView } from "@/components/cart/CartView";

export const metadata = { title: "Panier — Swell" };

export default function CartPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-24 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Ton panier</h1>
          <CartView />
        </div>
      </main>
      <Footer />
    </>
  );
}
