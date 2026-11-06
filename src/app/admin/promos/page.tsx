import { Suspense } from "react";
import { PromoManager } from "@/components/admin/PromoManager";
import { DashboardShell, DashboardSkeleton } from "@/components/dashboard/DashboardShell";
import { getPromoCodes } from "@/lib/promos";
import { requireAdmin } from "@/lib/session";
import { formatPrice } from "@/lib/shop-format";

export const metadata = { title: "Codes promo — Swell" };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function PromosPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PromosContent />
    </Suspense>
  );
}

async function PromosContent() {
  const admin = await requireAdmin();
  const promos = await getPromoCodes();
  const now = new Date();

  return (
    <DashboardShell user={admin} title="Codes promo" subtitle="Valables sur la boutique. Chaque client peut utiliser un même code une seule fois.">
      <PromoManager
        promos={promos.map((p) => ({
          id: p.id,
          code: p.code,
          label: p.kind === "percent" ? `-${p.value} %` : `-${formatPrice(p.value)}`,
          active: p.active,
          uses: p.uses,
          maxUses: p.maxUses,
          expiresLabel: p.expiresAt ? dateFormat.format(p.expiresAt) : null,
          expired: !!p.expiresAt && p.expiresAt < now,
        }))}
      />
    </DashboardShell>
  );
}
