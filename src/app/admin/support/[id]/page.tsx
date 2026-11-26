import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, KeyRound, Mail, Receipt } from "lucide-react";
import { TicketStatusButton } from "@/components/admin/SupportAdminControls";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { ReplyForm } from "@/components/support/ReplyForm";
import { TicketThread } from "@/components/support/TicketThread";
import { formatPrice } from "@/lib/shop-format";
import { requireAdmin } from "@/lib/session";
import { getSupportContext, getTicketById, getTicketFor } from "@/lib/support";
import { SUPPORT_STATUS_LABELS, subjectLabel } from "@/lib/support-format";

export const metadata = { title: "Demande — Support Swell" };

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
const ORDER_STATUS = { pending: "En attente", paid: "Payée", cancelled: "Annulée" } as const;

export default function SupportTicketAdminPage({ params }: PageProps<"/admin/support/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TicketAdminContent params={params} />
    </Suspense>
  );
}

async function TicketAdminContent({ params }: Pick<PageProps<"/admin/support/[id]">, "params">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const base = await getTicketById(id);
  if (!base) notFound();
  const [found, context] = await Promise.all([getTicketFor(base.reference, { admin: true }), getSupportContext(base.userId, base.email)]);
  if (!found) notFound();
  const { ticket, messages, product, order } = found;
  const firstName = ticket.name.trim().split(/\s+/)[0] || "";

  return (
    <DashboardShell user={admin} title={subjectLabel(ticket.subject)} subtitle={`Demande ${ticket.reference} · ${SUPPORT_STATUS_LABELS[ticket.status]}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/support" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={15} /> Toutes les demandes
        </Link>
        <TicketStatusButton ticketId={ticket.id} closed={ticket.status === "closed"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <TicketThread messages={messages} clientName={ticket.name} viewer="admin" />
          <div className="mt-6">
            <ReplyForm mode="admin" ticketId={ticket.id} firstName={firstName} />
          </div>
        </div>

        <aside className="space-y-4 text-sm">
          <section className="rounded-2xl border border-white/10 bg-surface p-4">
            <p className="font-semibold">{ticket.name}</p>
            <a href={`mailto:${ticket.email}?subject=${encodeURIComponent(`Ta demande ${ticket.reference}`)}`} className="mt-1 inline-flex items-center gap-1.5 text-muted hover:text-foreground">
              <Mail size={14} /> {ticket.email}
            </a>
            <p className="mt-2 text-xs text-muted">
              {context ? `Client depuis le ${day.format(context.account.createdAt)}` : "Pas de compte sur le site"}
              {product && ` · plugin : ${product.name}`}
              {order && ` · commande : ${order.reference}`}
            </p>
          </section>

          {context && (
            <>
              <section className="rounded-2xl border border-white/10 bg-surface p-4">
                <p className="flex items-center gap-2 font-medium">
                  <KeyRound size={15} /> Licences ({context.licenses.length})
                </p>
                {context.licenses.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">Aucune licence.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {context.licenses.map((l) => (
                      <li key={l.key} className="flex items-center justify-between gap-2">
                        <span className="truncate">{l.productName}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {l.revokedAt ? "désactivée" : l.trialEndsAt ? "démo" : l.viaSubscription ? "abonnement" : "achetée"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={`/admin/licences?q=${encodeURIComponent(context.account.email)}`} className="mt-3 inline-block text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
                  Gérer ses licences
                </Link>
              </section>

              <section className="rounded-2xl border border-white/10 bg-surface p-4">
                <p className="flex items-center gap-2 font-medium">
                  <Receipt size={15} /> Dernières commandes
                </p>
                {context.orders.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">Aucune commande.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {context.orders.map((o) => (
                      <li key={o.id}>
                        <p className="flex justify-between gap-2">
                          <span className="font-mono text-xs">{o.reference}</span>
                          <span className="text-xs text-muted">
                            {o.method === "gift" ? "Offerte" : `${ORDER_STATUS[o.status]} · ${o.total ? formatPrice(o.total) : "gratuit"}`}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted">{o.items.join(", ")}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={`/admin/commandes?statut=all&q=${encodeURIComponent(context.account.email)}`} className="mt-3 inline-block text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
                  Toutes ses commandes
                </Link>
              </section>
            </>
          )}
        </aside>
      </div>
    </DashboardShell>
  );
}
