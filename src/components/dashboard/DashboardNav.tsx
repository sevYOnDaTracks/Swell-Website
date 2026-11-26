"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioLines, CalendarPlus, Gauge, LifeBuoy, Music, Plug, Settings, UserRound } from "lucide-react";
import type { Site } from "@/lib/sites";

// Boutique : plugins et achats, sans réservation. Mix : réservations et instrumentales, sans plugins.
const CLIENT_LINKS: Record<Site, { href: string; label: string; Icon: typeof UserRound }[]> = {
  shop: [
    { href: "/compte", label: "Mon espace", Icon: UserRound },
    { href: "/compte/plugins", label: "Mes plugins", Icon: Plug },
    { href: "/compte/support", label: "Mes demandes", Icon: LifeBuoy },
    { href: "/compte/profil", label: "Mon profil", Icon: Settings },
  ],
  mix: [
    { href: "/compte", label: "Mon espace", Icon: UserRound },
    { href: "/reserver", label: "Réserver", Icon: CalendarPlus },
    { href: "/compte/sons", label: "Mes sons", Icon: Music },
    { href: "/compte/plugins", label: "Mes instrumentales", Icon: AudioLines },
    { href: "/compte/support", label: "Mes demandes", Icon: LifeBuoy },
    { href: "/compte/profil", label: "Mon profil", Icon: Settings },
  ],
};

// L'admin a sa propre barre latérale (AdminSidebar) : ici, un seul lien pour y aller.
const ADMIN_LINK = { href: "/admin", label: "Administration", Icon: Gauge };

/** Menu de l'espace connecté : icônes avec info-bulle, la page active en blanc. L'admin y a un lien vers son espace. */
export function DashboardNav({ isAdmin, site }: { isAdmin: boolean; site: Site }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/compte" ? pathname === href : pathname.startsWith(href));

  const renderLinks = (links: (typeof CLIENT_LINKS)["shop"]) =>
    links.map(({ href, label, Icon }) => {
      const active = isActive(href);
      return (
        <Link
          key={href}
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            active ? "bg-white text-black" : "text-muted hover:bg-white/10 hover:text-foreground"
          }`}
        >
          <Icon size={18} />
          <span className="pointer-events-none absolute top-full z-50 mt-2 hidden whitespace-nowrap rounded-md border border-white/10 bg-surface-2 px-2 py-1 text-xs text-foreground shadow-lg group-hover:block group-focus-visible:block">
            {label}
          </span>
        </Link>
      );
    });

  return (
    <div className="flex items-center gap-1">
      {renderLinks(CLIENT_LINKS[site])}
      {isAdmin && (
        <>
          <span aria-hidden className="mx-1.5 h-5 w-px bg-white/15" />
          {renderLinks([ADMIN_LINK])}
        </>
      )}
    </div>
  );
}
