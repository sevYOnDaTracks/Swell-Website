"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Clock,
  Crown,
  Disc3,
  ExternalLink,
  Gauge,
  Headset,
  KeyRound,
  Mail,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ShoppingBag,
  Star,
  Tags,
  TicketPercent,
  UserRound,
  Users,
  X,
} from "lucide-react";

export type AdminCounts = { bookings: number; orders: number; passes: number; support: number };

type Item = { href: string; label: string; Icon: typeof Gauge; count?: keyof AdminCounts };

// Pages de l'admin, rangées par usage. Le compteur signale ce qui attend une action.
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Pilotage", items: [{ href: "/admin", label: "Tableau de bord", Icon: Gauge, count: "bookings" }] },
  {
    title: "Ventes",
    items: [
      { href: "/admin/commandes", label: "Commandes", Icon: Receipt, count: "orders" },
      { href: "/admin/abonnements", label: "Abonnements", Icon: Crown, count: "passes" },
      { href: "/admin/promos", label: "Codes promo", Icon: TicketPercent },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/produits", label: "Produits", Icon: ShoppingBag },
      { href: "/admin/licences", label: "Licences", Icon: KeyRound },
      { href: "/admin/avis", label: "Avis clients", Icon: Star },
    ],
  },
  {
    title: "Site",
    items: [
      { href: "/admin/accueil", label: "Accueil et annonces", Icon: Megaphone },
      { href: "/admin/productions", label: "Productions", Icon: Disc3 },
    ],
  },
  {
    title: "Studio",
    items: [
      { href: "/admin/disponibilites", label: "Disponibilités", Icon: Clock },
      { href: "/admin/offres", label: "Services & tarifs", Icon: Tags },
    ],
  },
  {
    title: "Clients",
    items: [
      { href: "/admin/support", label: "Support", Icon: Headset, count: "support" },
      { href: "/admin/emails", label: "Emails", Icon: Mail },
      { href: "/admin/utilisateurs", label: "Utilisateurs", Icon: Users },
    ],
  },
];

const STORAGE_KEY = "swell-admin-sidebar";
const listeners = new Set<() => void>();
const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
};
function setCollapsed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "collapsed" : "open");
  } catch {
    // Stockage indisponible : le choix ne dure que le temps de la page.
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

function Nav({ counts, collapsed, onNavigate }: { counts: AdminCounts; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title}>
          {collapsed ? (
            <span aria-hidden className="mx-auto mb-2 block h-px w-6 bg-white/10" />
          ) : (
            <p className="mb-1.5 px-3 text-[11px] font-medium tracking-wide text-muted uppercase">{g.title}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ href, label, Icon, count }) => {
              const active = isActive(pathname, href);
              const n = count ? counts[count] : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? (n ? `${label} (${n})` : label) : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg text-sm transition-colors ${collapsed ? "h-10 justify-center" : "px-3 py-2"} ${
                      active ? "bg-white text-black" : "text-foreground/75 hover:bg-white/[0.07] hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
                    {n > 0 &&
                      (collapsed ? (
                        <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${active ? "bg-black" : "bg-amber-300"}`} aria-label={`${n} en attente`} />
                      ) : (
                        <span className={`rounded-full px-1.5 py-px text-xs font-semibold tabular-nums ${active ? "bg-black text-white" : "bg-amber-300 text-black"}`}>{n}</span>
                      ))}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Footer({ collapsed }: { collapsed: boolean }) {
  const linkClass = `flex items-center gap-3 rounded-lg text-sm text-muted transition-colors hover:bg-white/[0.07] hover:text-foreground ${collapsed ? "h-10 justify-center" : "px-3 py-2"}`;
  return (
    <div className="flex flex-col gap-0.5 border-t border-white/10 pt-3">
      <Link href="/compte" title={collapsed ? "Mon espace client" : undefined} className={linkClass}>
        <UserRound size={18} className="shrink-0" /> {!collapsed && "Mon espace client"}
      </Link>
      <Link href="/" target="_blank" title={collapsed ? "Voir le site" : undefined} className={linkClass}>
        <ExternalLink size={18} className="shrink-0" /> {!collapsed && "Voir le site"}
      </Link>
    </div>
  );
}

/**
 * Cadre des pages de l'admin : barre latérale à gauche (groupes, compteurs, repliable et mémorisée),
 * menu à ouvrir sur mobile. Hors de /admin, le contenu s'affiche sans barre latérale.
 */
export function AdminFrame({ isAdmin, counts, children }: { isAdmin: boolean; counts: AdminCounts; children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const inAdmin = isAdmin && pathname.startsWith("/admin");

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  if (!inAdmin) return <>{children}</>;
  const waiting = counts.bookings + counts.orders + counts.support;

  return (
    <div className="flex flex-1">
      <aside
        className={`sticky top-0 hidden h-svh shrink-0 flex-col border-r border-white/5 bg-surface/40 py-6 transition-[width] duration-200 lg:flex ${collapsed ? "w-[72px] px-3" : "w-60 px-3"}`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none]">
          <Nav counts={counts} collapsed={collapsed} />
        </div>
        <Footer collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          className={`mt-1 flex items-center gap-3 rounded-lg text-sm text-muted transition-colors hover:bg-white/[0.07] hover:text-foreground ${collapsed ? "h-10 justify-center" : "px-3 py-2"}`}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />} {!collapsed && "Replier"}
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-background/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
            <Menu size={17} /> Menu admin
            {waiting > 0 && <span className="rounded-full bg-amber-300 px-1.5 py-px text-xs font-semibold text-black tabular-nums">{waiting}</span>}
          </button>
        </div>
        {children}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-surface px-3 py-5">
            <div className="mb-4 flex items-center justify-between px-3">
              <p className="font-semibold">Administration</p>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Nav counts={counts} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
            <Footer collapsed={false} />
          </div>
        </div>
      )}
    </div>
  );
}
