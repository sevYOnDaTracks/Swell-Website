import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublicHomeSettings } from "@/lib/home";

/** Bannière promo en haut des pages de la boutique (réglée dans Admin → Accueil). */
export async function AnnouncementBar() {
  const { bar } = await getPublicHomeSettings();
  if (!bar.enabled) return null;
  const external = /^https:/.test(bar.href);
  const content = (
    <>
      <span className="font-medium">{bar.text}</span>
      {bar.href && (
        <span className="inline-flex items-center gap-1 font-semibold underline-offset-4 group-hover:underline">
          {bar.linkLabel || "En profiter"} <ArrowRight size={15} />
        </span>
      )}
    </>
  );
  const className = "group flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-center text-sm";
  return (
    <div className="bg-primary text-black">
      {bar.href ? (
        external ? (
          <a href={bar.href} target="_blank" rel="noopener" className={className}>
            {content}
          </a>
        ) : (
          <Link href={bar.href} className={className}>
            {content}
          </Link>
        )
      ) : (
        <p className={className}>{content}</p>
      )}
    </div>
  );
}
