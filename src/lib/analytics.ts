import "server-only";
import { createHash } from "node:crypto";
import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, like, lt, notInArray, not, sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvent, emailCampaign, product, shopOrder } from "@/db/schema";
import { addDays, parisNow } from "./booking";
import { isMixHost } from "./sites";

// Mesure d'audience maison (exemptée de consentement par la CNIL si elle reste anonyme et limitée) :
//  - pas de cookie : un visiteur = empreinte(adresse + navigateur + jour), brouillée et renouvelée chaque jour ;
//  - l'adresse IP n'est jamais enregistrée, les admins et les robots ne sont pas comptés ;
//  - les lignes sont effacées au bout de 13 mois.

const RETENTION_DAYS = 395;
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|curl|wget|python|axios|node-fetch|go-http/i;

export type AnalyticsKind = "view" | "cart" | "order";

const secret = () => process.env.BETTER_AUTH_SECRET ?? "dev-secret";

function clientIp(h: Headers) {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
}

const deviceOf = (ua: string) => (/iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone|iPod/i.test(ua) ? "mobile" : "desktop");

/** Pays indiqué par la langue du navigateur (fr-CI → CI) : approximatif, mais sans géolocalisation. */
function countryOf(h: Headers) {
  const m = (h.get("accept-language") ?? "").match(/[a-z]{2,3}-([A-Z]{2})\b/i);
  return m ? m[1].toUpperCase() : null;
}

const SOURCES: [RegExp, string][] = [
  [/instagram/, "Instagram"],
  [/tiktok/, "TikTok"],
  [/youtube|youtu\.be/, "YouTube"],
  [/(^|\.)google\./, "Google"],
  [/facebook|(^|\.)fb\.|messenger/, "Facebook"],
  [/(^|\.)t\.co$|twitter|(^|\.)x\.com$/, "X"],
  [/snapchat/, "Snapchat"],
  [/whatsapp|wa\.me/, "WhatsApp"],
  [/bing\./, "Bing"],
  [/duckduckgo/, "DuckDuckGo"],
  [/linkedin|lnkd\.in/, "LinkedIn"],
  [/reddit/, "Reddit"],
  [/discord/, "Discord"],
  [/mail\.|outlook|gmail/, "Emails"],
];

const UTM_NAMES: Record<string, string> = { email: "Emails", newsletter: "Emails", ig: "Instagram", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", fb: "Facebook" };

/** D'où vient le visiteur : le lien marqué (?utm_source=) d'abord, sinon le site précédent. */
function sourceOf(referrer: string, utmSource: string) {
  const utm = utmSource.trim().toLowerCase().slice(0, 40);
  if (utm) return UTM_NAMES[utm] ?? utm.charAt(0).toUpperCase() + utm.slice(1);
  if (!referrer) return "Direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Direct";
  }
  if (!host || host.endsWith("swell-audio.fr") || host === "localhost" || host.endsWith(".localhost")) return "Direct";
  return SOURCES.find(([re]) => re.test(host))?.[1] ?? host.slice(0, 60);
}

export type TrackInput = {
  kind: AnalyticsKind;
  path: string;
  /** Page d'entrée sur le site : on note la provenance. */
  landing?: boolean;
  referrer?: string;
  utmSource?: string;
  utmCampaign?: string;
};

/** Enregistre un événement. Les robots sont ignorés ; l'appelant écarte les admins. */
export async function recordEvent(h: Headers, input: TrackInput) {
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return;
  const path = input.path.split(/[?#]/)[0].slice(0, 200) || "/";
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return;
  const day = parisNow().date;
  const visitor = createHash("sha256").update(`${secret()}|${day}|${clientIp(h)}|${ua}`).digest("base64url").slice(0, 22);
  await db.insert(analyticsEvent).values({
    kind: input.kind,
    site: isMixHost(h.get("host")) ? "mix" : "shop",
    path,
    visitor,
    source: input.landing ? sourceOf(input.referrer ?? "", input.utmSource ?? "") : null,
    utmCampaign: input.landing && input.utmCampaign ? input.utmCampaign.slice(0, 60) : null,
    device: deviceOf(ua),
    country: countryOf(h),
    day,
  });
  // De temps en temps, on efface ce qui a plus de 13 mois.
  if (Math.random() < 0.005) {
    await db.delete(analyticsEvent).where(lt(analyticsEvent.createdAt, new Date(Date.now() - RETENTION_DAYS * 86_400_000)));
  }
}

// --- Lecture pour l'admin ----------------------------------------------------------

export type Period = "7" | "30" | "365";
export type SiteFilter = "all" | "shop" | "mix";
export type Bucket = { key: string; label: string; visitors: number; views: number };

const PAGE_NAMES: Record<string, string> = {
  "/": "Accueil",
  "/boutique": "Boutique",
  "/boutique/aide": "Installer un plugin",
  "/abonnement": "Abonnement",
  "/support": "Support",
  "/panier": "Panier",
  "/compte": "Mon espace",
  "/connexion": "Connexion",
  "/inscription": "Inscription",
  "/instrumentales": "Instrumentales",
  "/reserver": "Réserver",
  "/cgv": "CGV",
  "/confidentialite": "Confidentialité",
  "/mentions-legales": "Mentions légales",
};

/** Nom lisible d'une page : nom connu, nom du plugin, sinon l'adresse. */
function pageLabel(path: string, products: Map<string, string>) {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  const m = path.match(/^\/boutique\/([^/]+)$/);
  return (m && products.get(m[1])) || path;
}

const monthLabel = (ym: string) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

/** Toutes les statistiques d'une période (jours glissants jusqu'à aujourd'hui inclus). */
export async function getAnalytics(period: Period, site: SiteFilter) {
  const days = Number(period);
  const today = parisNow().date;
  const since = addDays(today, -(days - 1));
  const prevSince = addDays(since, -days);
  const e = analyticsEvent;
  const siteCond = site === "all" ? undefined : eq(e.site, site);
  const views = and(eq(e.kind, "view"), gte(e.day, since), siteCond);

  const totals = async (from: string, to?: string) => {
    const [row] = await db
      .select({ visitors: countDistinct(e.visitor), views: count() })
      .from(e)
      .where(and(eq(e.kind, "view"), gte(e.day, from), to ? lt(e.day, to) : undefined, siteCond));
    return { visitors: row?.visitors ?? 0, views: row?.views ?? 0 };
  };

  const distinctBy = <T extends typeof e.source | typeof e.path | typeof e.device | typeof e.country | typeof e.utmCampaign>(col: T, extra?: ReturnType<typeof and>, limit = 8) =>
    db
      .select({ key: col, visitors: countDistinct(e.visitor), views: count() })
      .from(e)
      .where(and(views, isNotNull(col), extra))
      .groupBy(col)
      .orderBy(desc(countDistinct(e.visitor)), desc(count()))
      .limit(limit);

  const [current, previous, perDay, sources, pages, productRows, devices, countries, campaignRows, funnelRows, paid] = await Promise.all([
    totals(since),
    totals(prevSince, since),
    db
      .select({ day: e.day, visitors: countDistinct(e.visitor), views: count() })
      .from(e)
      .where(views)
      .groupBy(e.day),
    distinctBy(e.source),
    distinctBy(e.path, undefined, 10),
    distinctBy(e.path, and(like(e.path, "/boutique/%"), not(like(e.path, "/boutique/aide%"))), 8),
    distinctBy(e.device, undefined, 3),
    distinctBy(e.country, undefined, 6),
    distinctBy(e.utmCampaign, undefined, 6),
    db
      .select({
        products: sql<number>`count(distinct case when ${e.kind} = 'view' and ${e.path} like '/boutique/%' and ${e.path} not like '/boutique/aide%' then ${e.visitor} end)`,
        cart: sql<number>`count(distinct case when ${e.kind} = 'cart' then ${e.visitor} end)`,
        order: sql<number>`count(distinct case when ${e.kind} = 'order' then ${e.visitor} end)`,
      })
      .from(e)
      .where(and(gte(e.day, since), siteCond)),
    // Paiements validés sur la période (vraies commandes : ni cadeaux, ni gratuits).
    db
      .select({ n: count() })
      .from(shopOrder)
      .where(and(eq(shopOrder.status, "paid"), notInArray(shopOrder.method, ["gift", "free"]), gte(shopOrder.paidAt, new Date(`${since}T00:00:00`)))),
  ]);

  // Courbe : un point par jour (7 ou 30 jours) ou par mois (12 mois), jours sans visite compris.
  const byDay = new Map(perDay.map((d) => [d.day, d]));
  let chart: Bucket[];
  if (days <= 31) {
    chart = Array.from({ length: days }, (_, i) => {
      const day = addDays(since, i);
      const d = byDay.get(day);
      return { key: day, label: new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), visitors: d?.visitors ?? 0, views: d?.views ?? 0 };
    });
  } else {
    const months = new Map<string, Bucket>();
    for (let i = 0; i < 12; i++) {
      const [y, m] = today.split("-").map(Number);
      const date = new Date(Date.UTC(y, m - 1 - (11 - i), 15));
      const ym = date.toISOString().slice(0, 7);
      months.set(ym, { key: ym, label: monthLabel(ym), visitors: 0, views: 0 });
    }
    for (const d of perDay) {
      const b = months.get(d.day.slice(0, 7));
      if (b) {
        b.visitors += d.visitors;
        b.views += d.views;
      }
    }
    chart = [...months.values()];
  }

  // Noms des plugins et sujets des campagnes.
  const slugs = [...new Set([...productRows, ...pages].map((r) => r.key!.split("/")[2]).filter(Boolean))];
  const names = slugs.length ? await db.select({ slug: product.slug, name: product.name }).from(product).where(inArray(product.slug, slugs)) : [];
  const nameOf = new Map(names.map((n) => [n.slug, n.name]));
  const products = productRows
    .map((r) => ({ ...r, slug: r.key!.split("/")[2] }))
    .filter((r) => nameOf.has(r.slug))
    .map((r) => ({ key: r.key!, label: nameOf.get(r.slug)!, visitors: r.visitors, views: r.views }));

  const ids = campaignRows.map((r) => r.key!);
  const subjects = ids.length ? await db.select({ id: emailCampaign.id, subject: emailCampaign.subject }).from(emailCampaign).where(inArray(emailCampaign.id, ids)) : [];
  const subjectOf = new Map(subjects.map((s) => [s.id, s.subject]));
  const campaigns = campaignRows.map((r) => ({ key: r.key!, label: subjectOf.get(r.key!) ?? r.key!, visitors: r.visitors, views: r.views }));

  const f = funnelRows[0];
  const funnel = [
    { label: "Visiteurs", n: current.visitors },
    { label: "Ont vu un plugin", n: Number(f?.products ?? 0) },
    { label: "Ont ajouté au panier", n: Number(f?.cart ?? 0) },
    { label: "Ont passé commande", n: Number(f?.order ?? 0) },
    { label: "Paiements validés", n: paid[0]?.n ?? 0 },
  ];

  const row = (r: { key: string | null; visitors: number; views: number }, label?: string) => ({ key: r.key!, label: label ?? r.key!, visitors: r.visitors, views: r.views });
  const DEVICE: Record<string, string> = { mobile: "Téléphone", desktop: "Ordinateur", tablet: "Tablette" };
  const region = new Intl.DisplayNames(["fr"], { type: "region" });

  return {
    since,
    current,
    previous,
    chart,
    sources: sources.map((r) => row(r)),
    pages: pages.map((r) => row(r, pageLabel(r.key!, nameOf))),
    products,
    devices: devices.map((r) => row(r, DEVICE[r.key!] ?? r.key!)),
    countries: countries.map((r) => {
      let label = r.key!;
      try {
        label = region.of(r.key!) ?? r.key!;
      } catch {}
      return row(r, label);
    }),
    campaigns,
    funnel,
  };
}

/** Note une commande passée (pour le tunnel), depuis une action serveur. Les admins ne sont pas comptés. */
export async function recordOrder(role: string | null | undefined, path: string) {
  if (role === "admin") return;
  const { headers } = await import("next/headers");
  await recordEvent(await headers(), { kind: "order", path }).catch(() => {});
}
