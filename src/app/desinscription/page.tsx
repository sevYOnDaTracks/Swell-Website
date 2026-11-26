import { Suspense } from "react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { UnsubscribeButton } from "@/components/marketing/UnsubscribeButton";

export const metadata = { title: "Se désinscrire — Swell", robots: { index: false, follow: false } };

export default function UnsubscribePage({ searchParams }: PageProps<"/desinscription">) {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-20 sm:px-6">
        <h1 className="font-condensed text-5xl leading-none tracking-tight uppercase">Ne plus recevoir nos emails</h1>
        <p className="mt-4 text-foreground/85">Tu ne recevras plus les nouveautés ni les promos de Swell. Un clic suffit.</p>
        <div className="mt-8">
          <Suspense>
            <Confirm searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

async function Confirm({ searchParams }: Pick<PageProps<"/desinscription">, "searchParams">) {
  const params = await searchParams;
  const u = typeof params.u === "string" ? params.u : "";
  const t = typeof params.t === "string" ? params.t : "";
  if (!u || !t) return <p className="text-sm text-muted">Ce lien est incomplet. Utilise le lien en bas d&apos;un de nos emails, ou change ton choix dans ton profil.</p>;
  return <UnsubscribeButton userId={u} token={t} />;
}
