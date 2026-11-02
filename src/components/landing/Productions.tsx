import Image from "next/image";
import { Disc3, ExternalLink } from "lucide-react";
import { PreviewButton } from "@/components/shop/PreviewButton";
import { platformName } from "@/lib/listen-link";
import { getPublishedProductions } from "@/lib/productions";
import { mediaUrl } from "@/lib/shop-format";
import { SectionHeading } from "./SectionHeading";

export async function Productions() {
  const productions = await getPublishedProductions();
  if (productions.length === 0) return null;

  return (
    <section id="productions" className="scroll-mt-20 border-y border-white/5 bg-surface/40 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Dernières productions"
          title="Ça sort du studio"
          description="Les derniers titres sur lesquels j'ai posé les mains. Lance un extrait."
        />

        <ul
          className={`mt-14 grid gap-4 ${
            productions.length === 1 ? "mx-auto max-w-sm" : productions.length === 2 ? "mx-auto max-w-3xl sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {productions.map((p) => (
            <li key={p.id} className="group overflow-hidden rounded-2xl border border-white/5 bg-surface transition-colors hover:border-white/25">
              <div className="relative aspect-square overflow-hidden">
                {p.coverFile ? (
                  <Image
                    src={mediaUrl(p.coverFile)}
                    alt={`Pochette de ${p.title}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 via-surface-2 to-white/[0.02]">
                    <Disc3 size={48} className="text-white/60" />
                  </div>
                )}
                {p.role && (
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white/90 backdrop-blur">
                    {p.role}
                  </span>
                )}
                {p.audioFile && (
                  <div className="absolute bottom-3 right-3">
                    <PreviewButton src={mediaUrl(p.audioFile)} label={p.title} />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{p.title}</h3>
                  {p.artist && <p className="truncate text-sm text-muted">{p.artist}</p>}
                </div>
                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-white/5 hover:text-foreground"
                  >
                    {platformName(p.link)} <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
