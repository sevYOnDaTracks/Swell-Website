import Link from "next/link";
import { Suspense } from "react";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { ArrowRight, Download, KeyRound, MessageCircle, Monitor, Wallet } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { SupportForm } from "@/components/support/SupportForm";
import { db } from "@/db";
import { license, product, shopOrder, shopOrderItem, supportSubjects, type SupportSubject } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { formatPrice } from "@/lib/shop-format";
import { currentSite } from "@/lib/site-server";
import { getSupportSettings } from "@/lib/support";

export const metadata = {
  title: "Support — Swell",
  description: "Une question, un souci d'activation ou de paiement ? Écris au support Swell : réponse en général dans la journée.",
};

// Réponses rapides : elles règlent une bonne partie des demandes sans attendre.
const QUICK = [
  { Icon: KeyRound, title: "Activer ma licence", text: "Où trouver ta clé et comment la coller dans le plugin.", href: "/boutique/aide#activer" },
  { Icon: Download, title: "Installer un plugin", text: "Installateur Mac ou Windows, et le faire apparaître dans ton logiciel.", href: "/boutique/aide#installer" },
  { Icon: Monitor, title: "Changer d'ordinateur", text: "Libérer une activation pour passer sur une autre machine.", href: "/boutique/aide#ordinateurs" },
  { Icon: Wallet, title: "Payer et suivre une commande", text: "PayPal, Wero, Wave, Orange Money : tes commandes et leur état.", href: "/compte/plugins" },
];

export default function SupportPage({ searchParams }: PageProps<"/support">) {
  return (
    <Suspense>
      <SupportContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SupportContent({ searchParams }: Pick<PageProps<"/support">, "searchParams">) {
  const [site, user, settings, params] = await Promise.all([currentSite(), getCurrentUser(), getSupportSettings(), searchParams]);
  const asked = typeof params.sujet === "string" ? params.sujet : "";
  const defaultSubject = supportSubjects.includes(asked as SupportSubject) ? (asked as SupportSubject) : undefined;

  // Plugins proposés : ceux du client d'abord (ses licences), puis le reste du catalogue.
  const [catalog, owned, orders] = await Promise.all([
    db.select({ id: product.id, name: product.name }).from(product).where(eq(product.published, true)).orderBy(asc(product.name)),
    user ? db.select({ productId: license.productId }).from(license).where(eq(license.userId, user.id)) : Promise.resolve([]),
    user
      ? db
          .select({ id: shopOrder.id, reference: shopOrder.reference, total: shopOrder.totalCents, createdAt: shopOrder.createdAt })
          .from(shopOrder)
          .where(eq(shopOrder.userId, user.id))
          .orderBy(desc(shopOrder.createdAt))
          .limit(20)
      : Promise.resolve([]),
  ]);
  const ownedIds = new Set(owned.map((o) => o.productId));
  const products = [...catalog.filter((p) => ownedIds.has(p.id)), ...catalog.filter((p) => !ownedIds.has(p.id))].map((p) => ({
    id: p.id,
    label: ownedIds.has(p.id) ? `${p.name} (dans ton espace)` : p.name,
  }));
  const items = orders.length
    ? await db.select({ orderId: shopOrderItem.orderId, name: shopOrderItem.name }).from(shopOrderItem).where(inArray(shopOrderItem.orderId, orders.map((o) => o.id)))
    : [];
  const orderOptions = orders.map((o) => ({
    id: o.id,
    label: `${o.reference} · ${items
      .filter((i) => i.orderId === o.id)
      .map((i) => i.name)
      .join(", ")} · ${o.total ? formatPrice(o.total) : "gratuit"}`,
  }));
  const whatsapp = settings.whatsapp.replace(/[^\d]/g, "");

  return (
    <>
      <Navbar site={site} />
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 sm:px-6">
          <h1 className="font-condensed text-6xl leading-[0.95] tracking-tight uppercase sm:text-7xl">Support</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-foreground/85">
            Une question, un souci d&apos;activation ou de paiement ? Écris-nous : on répond en général dans la journée.
          </p>
          {user && (
            <Link href="/compte/support" className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
              Voir mes demandes <ArrowRight size={14} />
            </Link>
          )}
        </section>

        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-sm font-medium text-muted">Souvent, la réponse est déjà là</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {QUICK.map(({ Icon, title, text, href }) => (
              <li key={title}>
                <Link href={href} className="group flex items-start gap-4 rounded-xl border border-white/10 px-4 py-3.5 transition-colors hover:border-white/30">
                  <Icon size={18} className="mt-0.5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{title}</span>
                    <span className="block text-sm text-muted">{text}</span>
                  </span>
                  <ArrowRight size={16} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto grid grid-cols-1 max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <h2 className="mb-4 text-xl font-semibold">Écrire au support</h2>
            <SupportForm viewer={user ? { name: user.name, email: user.email } : null} products={products} orders={orderOptions} defaultSubject={defaultSubject} />
          </div>
          <aside className="space-y-4 text-sm lg:pt-12">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3.5 transition-colors hover:border-white/30"
              >
                <MessageCircle size={18} className="shrink-0" />
                <span>
                  <span className="block font-medium">WhatsApp</span>
                  <span className="block text-muted">Pour une question rapide</span>
                </span>
              </a>
            )}
            <div className="rounded-xl border border-white/5 px-4 py-3.5 text-muted">
              <p className="font-medium text-foreground">Pour aller plus vite</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Ton système (Mac ou Windows) et ton logiciel de musique</li>
                <li>Le message d&apos;erreur exact, ou une capture d&apos;écran</li>
                <li>La référence de ta commande (SW-…) pour un paiement</li>
              </ul>
            </div>
          </aside>
        </section>
      </main>
      <Footer site={site} />
    </>
  );
}
