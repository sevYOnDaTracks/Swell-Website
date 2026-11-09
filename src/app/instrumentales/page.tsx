import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AudioLines } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { PreviewButton } from "@/components/shop/PreviewButton";
import { QuickAddButton } from "@/components/cart/QuickAddButton";
import { getInstrumentals } from "@/lib/shop";
import { formatPrice, mediaUrl } from "@/lib/shop-format";

export const metadata = {
  title: "Instrumentales — Swell",
  description: "Les prods de sevyondatracks : écoute les extraits et récupère tes instrumentales.",
};

export default function InstrumentalsPage({ searchParams }: PageProps<"/instrumentales">) {
  return (
    <>
      <Navbar site="mix" />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6">
            <p className="text-sm font-medium text-accent">Instrumentales</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Les prods de sevyondatracks</h1>
            <p className="mt-3 max-w-xl text-muted">Écoute les extraits, choisis ta prod et pose ta voix dessus.</p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Suspense fallback={<ListSkeleton />}>
            <InstrumentalList searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <Footer site="mix" />
    </>
  );
}

async function InstrumentalList({ searchParams }: Pick<PageProps<"/instrumentales">, "searchParams">) {
  const params = await searchParams;
  const genre = typeof params.genre === "string" ? params.genre : undefined;
  const { items, genres, total } = await getInstrumentals({ genre });

  if (total === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center">
        <AudioLines size={32} className="text-muted" />
        <p className="mt-4 font-medium">Les premières prods arrivent très bientôt</p>
        <p className="mt-1 text-sm text-muted">Reviens écouter les nouveautés.</p>
      </div>
    );
  }

  return (
    <>
      {genres.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Filtrer par style">
          <li>
            <TagLink href="/instrumentales" active={!genre}>
              Toutes
            </TagLink>
          </li>
          {genres.map((g) => (
            <li key={g}>
              <TagLink href={`/instrumentales?genre=${encodeURIComponent(g)}`} active={genre === g}>
                {g}
              </TagLink>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm text-muted">
        {items.length} instrumentale{items.length > 1 ? "s" : ""}
      </p>

      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center text-sm text-muted">
          Aucune prod dans ce style pour l&apos;instant.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5 bg-surface">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-4 p-3 sm:p-4">
              {/* Sur téléphone, la pochette laisse la place au titre. */}
              <div className="relative hidden h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:block">
                {p.coverFile ? (
                  <Image src={mediaUrl(p.coverFile)} alt="" fill sizes="64px" unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <AudioLines size={22} className="text-white/60" />
                  </div>
                )}
              </div>

              {p.previewFile && <PreviewButton src={mediaUrl(p.previewFile)} label={p.name} />}

              <Link href={`/instrumentales/${p.slug}`} className="min-w-0 flex-1 hover:underline-offset-4">
                <p className="truncate font-semibold hover:underline">{p.name}</p>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {[p.bpm && `${p.bpm} BPM`, p.musicalKey, ...p.genres].filter(Boolean).join(" · ")}
                </p>
              </Link>

              <Link
                href={`/instrumentales/${p.slug}`}
                className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/5"
              >
                {formatPrice(p.priceCents)}
              </Link>
              {p.downloadFile && <QuickAddButton productId={p.id} name={p.name} variant="inline" />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TagLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`block rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-white bg-white text-black" : "border-white/10 text-muted hover:border-white/30 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-9 w-64 rounded-full bg-white/5" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}
