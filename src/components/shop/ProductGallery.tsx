"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";
import type { ProductType } from "@/db/schema";
import { mediaUrl, youtubeId } from "@/lib/shop-format";
import { ProductCover } from "./ProductCard";

type GalleryProduct = {
  slug: string;
  name: string;
  type: ProductType;
  shortDescription: string;
  priceCents: number;
  coverFile: string | null;
  previewFile: string | null;
  galleryFiles: string[];
  videoUrl: string | null;
  videoFile: string | null;
};

type Slide = { kind: "cover" } | { kind: "photo"; file: string } | { kind: "youtube"; id: string } | { kind: "video"; file: string };

/** Visuel, vidéo et photos de la fiche produit. La vidéo (et YouTube) ne se charge qu'au clic. */
export function ProductGallery({ product }: { product: GalleryProduct }) {
  const ytId = product.videoUrl ? youtubeId(product.videoUrl) : null;
  const slides: Slide[] = [
    { kind: "cover" },
    ...(ytId ? [{ kind: "youtube", id: ytId } as const] : []),
    ...(product.videoFile ? [{ kind: "video", file: product.videoFile } as const] : []),
    ...product.galleryFiles.map((file) => ({ kind: "photo", file }) as const),
  ];
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? slides[0];
  const isVideo = slide.kind === "youtube" || slide.kind === "video";

  return (
    <div>
      <div className={`relative overflow-hidden rounded-2xl border border-white/5 ${isVideo ? "aspect-video bg-black" : "aspect-square bg-surface"}`}>
        {slide.kind === "cover" && <ProductCover product={product} sizes="(min-width: 1024px) 50vw, 100vw" eager />}
        {slide.kind === "photo" && (
          <Image src={mediaUrl(slide.file)} alt={product.name} fill sizes="(min-width: 1024px) 50vw, 100vw" unoptimized className="object-cover" />
        )}
        {slide.kind === "youtube" && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${slide.id}?autoplay=1&rel=0`}
            title={`Vidéo de présentation : ${product.name}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        )}
        {slide.kind === "video" && (
          <video src={mediaUrl(slide.file)} controls autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full" />
        )}
      </div>

      {slides.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {slides.map((s, i) => {
            const video = s.kind === "youtube" || s.kind === "video";
            const thumb = s.kind === "photo" ? s.file : product.coverFile;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index}
                  aria-label={
                    s.kind === "photo" ? `Voir la photo ${product.galleryFiles.indexOf(s.file) + 1}` : video ? "Voir la vidéo de présentation" : "Voir le visuel"
                  }
                  className={`relative block aspect-square w-full overflow-hidden rounded-lg border bg-surface transition-colors ${i === index ? "border-white" : "border-white/10 hover:border-white/40"}`}
                >
                  {thumb && <Image src={mediaUrl(thumb)} alt="" fill sizes="96px" unoptimized className={`object-cover ${video ? "opacity-50" : ""}`} />}
                  {video && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Play size={20} className="fill-white text-white" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
