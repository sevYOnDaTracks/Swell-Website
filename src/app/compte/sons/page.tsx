import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Download, Music } from "lucide-react";
import { Card, DashboardShell, DashboardSkeleton, EmptyState } from "@/components/dashboard/DashboardShell";
import { SongPlayer } from "@/components/booking/SongPlayer";
import { formatDate } from "@/lib/booking";
import { getServiceNames } from "@/lib/offers";
import { requireUser } from "@/lib/session";
import { getMySongs } from "@/lib/session-files";
import { formatBytes } from "@/lib/shop-format";
import { currentSite } from "@/lib/site-server";
import { MIX_URL } from "@/lib/sites";

export const metadata = { title: "Mes sons — Swell" };

export default function MySongsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MySongsContent />
    </Suspense>
  );
}

// Tout ce que Swell a rendu au client après ses séances, du plus récent au plus ancien.
async function MySongsContent() {
  const user = await requireUser();
  // Les séances sont sur mix : la boutique renvoie vers la même page sur mix.
  if ((await currentSite()) !== "mix") redirect(`${MIX_URL}/compte/sons`);
  const [songs, serviceName] = await Promise.all([getMySongs(user.id), getServiceNames()]);

  return (
    <DashboardShell user={user} title="Mes sons" subtitle="Tout ce que Swell t'a rendu après tes séances : écoute et télécharge quand tu veux.">
      <Card title="Tous tes fichiers" action={<span className="text-xs text-muted">{songs.length} fichier{songs.length > 1 ? "s" : ""}</span>}>
        {songs.length === 0 ? (
          <EmptyState>
            Tes sons apparaîtront ici après tes séances.{" "}
            <Link href="/reserver" className="text-foreground underline underline-offset-4">
              Réserver une séance
            </Link>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {songs.map((s) => (
              <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 via-surface-2 to-white/[0.02]">
                    <Music size={18} className="text-white/60" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium break-words">{s.name}</p>
                    <p className="text-sm text-muted">
                      {serviceName(s.service)} · <span className="capitalize">{formatDate(s.date)}</span> · {formatBytes(s.size)}
                    </p>
                  </div>
                  <a
                    href={`/api/seances/fichiers/${s.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
                    aria-label={`Télécharger ${s.name}`}
                  >
                    <Download size={15} /> <span className="hidden sm:inline">Télécharger</span>
                  </a>
                </div>
                {s.playable && (
                  <div className="mt-3">
                    <SongPlayer src={`/api/seances/fichiers/${s.id}?ecouter=1`} label={s.name} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardShell>
  );
}
