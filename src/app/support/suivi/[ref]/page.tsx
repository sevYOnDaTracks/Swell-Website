import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { ReplyForm } from "@/components/support/ReplyForm";
import { TicketThread } from "@/components/support/TicketThread";
import { getCurrentUser } from "@/lib/session";
import { currentSite } from "@/lib/site-server";
import { getTicketFor } from "@/lib/support";
import { SUPPORT_STATUS_LABELS, subjectLabel } from "@/lib/support-format";

export const metadata = { title: "Ma demande — Support Swell", robots: { index: false, follow: false } };

export default function TicketPage({ params, searchParams }: PageProps<"/support/suivi/[ref]">) {
  return (
    <Suspense>
      <TicketContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

// Suivi d'une demande : par le compte du client, ou par le lien secret de l'email (?t=...).
async function TicketContent({ params, searchParams }: Pick<PageProps<"/support/suivi/[ref]">, "params" | "searchParams">) {
  const [{ ref }, query, user, site] = await Promise.all([params, searchParams, getCurrentUser(), currentSite()]);
  const token = typeof query.t === "string" ? query.t : undefined;
  const found = await getTicketFor(ref, { userId: user?.id, token, admin: user?.role === "admin" });
  if (!found) notFound();
  const { ticket, messages, product, order } = found;
  const closed = ticket.status === "closed";

  return (
    <>
      <Navbar site={site} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <Link href={user ? "/compte/support" : "/support"} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={15} /> {user ? "Mes demandes" : "Support"}
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{subjectLabel(ticket.subject)}</h1>
            <p className="mt-1 text-sm text-muted">
              Demande {ticket.reference}
              {product && ` · ${product.name}`}
              {order && ` · commande ${order.reference}`}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${ticket.status === "answered" ? "bg-white text-black" : "bg-white/10"}`}>
            {SUPPORT_STATUS_LABELS[ticket.status]}
          </span>
        </div>
        <div className="mt-8">
          <TicketThread messages={messages} clientName={ticket.name} token={token} viewer="client" />
        </div>
        <div className="mt-6">
          <ReplyForm mode="client" reference={ticket.reference} token={token} closed={closed} />
        </div>
      </main>
      <Footer site={site} />
    </>
  );
}
