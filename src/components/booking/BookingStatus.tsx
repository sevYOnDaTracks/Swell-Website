import type { BookingStatus } from "@/db/schema";

const LABELS: Record<BookingStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  proposed: "Nouveau créneau proposé",
};

const STYLES: Record<BookingStatus, string> = {
  pending: "border border-white/20 text-foreground",
  confirmed: "bg-white text-black",
  cancelled: "bg-white/5 text-muted line-through",
  proposed: "border border-dashed border-white/40 text-foreground",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs whitespace-nowrap ${STYLES[status]}`}>{LABELS[status]}</span>;
}
