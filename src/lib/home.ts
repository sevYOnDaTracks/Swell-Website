import "server-only";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { setting } from "@/db/schema";
import { DEFAULT_HOME_SETTINGS, notEnded, type HomeSettings } from "./home-format";

const KEY = "home";
export const HOME_TAG = "home";

export async function getHomeSettings(): Promise<HomeSettings> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, KEY));
  if (!row) return DEFAULT_HOME_SETTINGS;
  try {
    const raw = JSON.parse(row.value) as Partial<HomeSettings>;
    return {
      campaign: { ...DEFAULT_HOME_SETTINGS.campaign, ...raw.campaign },
      bar: { ...DEFAULT_HOME_SETTINGS.bar, ...raw.bar },
      slides: Array.isArray(raw.slides) ? raw.slides : [],
      newProductIds: Array.isArray(raw.newProductIds) ? raw.newProductIds : [],
    };
  } catch {
    return DEFAULT_HOME_SETTINGS;
  }
}

export async function saveHomeSettings(value: HomeSettings) {
  const json = JSON.stringify(value);
  await db.insert(setting).values({ key: KEY, value: json }).onConflictDoUpdate({ target: setting.key, set: { value: json } });
}

/**
 * Réglages publics, sans ce qui est masqué ou terminé. Mis en cache jusqu'à la prochaine fin
 * d'annonce ou de bannière : une promo datée disparaît toute seule.
 */
export async function getPublicHomeSettings(): Promise<HomeSettings> {
  "use cache";
  cacheTag(HOME_TAG);
  const settings = await getHomeSettings();
  const now = Date.now();
  const ends = [settings.campaign.endsAt, settings.bar.endsAt, ...settings.slides.map((s) => s.endsAt)]
    .flatMap((e) => (e ? [new Date(e).getTime()] : []))
    .filter((t) => t > now);
  if (ends.length > 0) {
    const seconds = Math.max(60, Math.ceil((Math.min(...ends) - now) / 1000));
    cacheLife({ stale: 30, revalidate: seconds, expire: seconds + 60 });
  } else {
    cacheLife("max");
  }
  const bar = settings.bar;
  const campaign = settings.campaign;
  return {
    campaign: { ...campaign, enabled: campaign.enabled && !!campaign.title.trim() && notEnded(campaign.endsAt, now) },
    bar: { ...bar, enabled: bar.enabled && !!bar.text.trim() && notEnded(bar.endsAt, now) },
    slides: settings.slides.filter((s) => s.enabled && s.title.trim() && notEnded(s.endsAt, now)),
    newProductIds: settings.newProductIds,
  };
}
