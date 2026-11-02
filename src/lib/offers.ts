import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { plan, service, setting } from "@/db/schema";

// Services et tarifs affichés sur le site, gérés depuis /admin/offres.
// Mis en cache et invalidés par updateTag(OFFERS_TAG) à chaque modification.
export const OFFERS_TAG = "offers";

const DEFAULT_SERVICES = [
  {
    id: "mixing",
    name: "Mixing & Mastering",
    description: "Un mix propre, large et punchy, prêt pour Spotify, Apple Music et les clubs.",
    icon: "sliders",
    durationMinutes: 60,
  },
  {
    id: "prod",
    name: "Prod / Reprod",
    description: "Une instru sur mesure, ou la reprod fidèle d'un son de référence.",
    icon: "music",
    durationMinutes: 120,
  },
  {
    id: "voix",
    name: "Prise de voix à distance",
    description: "Session guidée en live : tu enregistres chez toi, je pilote la prise.",
    icon: "mic",
    durationMinutes: 120,
  },
  {
    id: "plugins",
    name: "Installation de plugins",
    description: "J'installe et je configure tes VST à distance, sans prise de tête.",
    icon: "plug",
    durationMinutes: 60,
  },
];

const DEFAULT_PLANS = [
  {
    name: "Mix",
    price: "79 €",
    unit: "/ titre",
    description: "Pour un son propre et équilibré.",
    features: ["Mix jusqu'à 32 pistes", "2 révisions", "Livraison sous 5 jours"],
    serviceId: "mixing",
  },
  {
    name: "Mix + Master",
    price: "119 €",
    unit: "/ titre",
    description: "Le pack complet, prêt à sortir.",
    features: ["Mix illimité en pistes", "Mastering streaming", "3 révisions", "Livraison sous 4 jours"],
    serviceId: "mixing",
    highlighted: true,
  },
  {
    name: "Prod / Reprod",
    price: "Sur devis",
    unit: "",
    description: "Une instru pensée pour ton projet.",
    features: ["Brief en visio", "Stems fournis", "Droits selon licence"],
    serviceId: "prod",
  },
];

/** Insère les services et tarifs de départ une seule fois (base neuve). */
function seedDefaults() {
  const seeded = db.select().from(setting).where(eq(setting.key, "offers_seeded")).get();
  if (seeded) return;
  db.transaction((tx) => {
    tx.insert(service)
      .values(DEFAULT_SERVICES.map((s, position) => ({ ...s, position })))
      .onConflictDoNothing()
      .run();
    tx.insert(plan)
      .values(DEFAULT_PLANS.map((p, position) => ({ ...p, position })))
      .run();
    tx.insert(setting).values({ key: "offers_seeded", value: "1" }).run();
  });
}

export async function getServices() {
  "use cache";
  cacheTag(OFFERS_TAG);
  cacheLife("max");
  seedDefaults();
  return db.select().from(service).orderBy(asc(service.position));
}

export async function getPlans() {
  "use cache";
  cacheTag(OFFERS_TAG);
  cacheLife("max");
  seedDefaults();
  return db.select().from(plan).orderBy(asc(plan.position));
}

export async function getBookableServices() {
  return (await getServices()).filter((s) => s.bookable);
}

export async function getServiceById(id: string) {
  return (await getServices()).find((s) => s.id === id);
}

/** Nom d'un service pour l'affichage (garde l'identifiant si le service a été supprimé). */
export async function getServiceNames() {
  const services = await getServices();
  return (id: string) => services.find((s) => s.id === id)?.name ?? id;
}
