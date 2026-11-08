import type { orderStatuses } from "@/db/schema";

type OrderStatus = (typeof orderStatuses)[number];

const LABELS: Record<OrderStatus, string> = {
  pending: "En attente de paiement",
  paid: "Payée",
  cancelled: "Annulée",
};

const STYLES: Record<OrderStatus, string> = {
  pending: "border border-white/20 text-foreground",
  paid: "bg-white text-black",
  cancelled: "bg-white/5 text-muted line-through",
};

/** Statut d'une commande, lisible par le client. Une commande gratuite s'affiche « Validée », un cadeau « Offerte ». */
export function OrderStatusBadge({ status, free = false, gift = false }: { status: OrderStatus; free?: boolean; gift?: boolean }) {
  const label = status === "paid" && gift ? "Offerte" : status === "paid" && free ? "Validée" : LABELS[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs whitespace-nowrap ${STYLES[status]}`}>{label}</span>;
}
