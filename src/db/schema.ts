import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Tables requises par Better Auth (+ champs du plugin admin : role, banned...).

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  // Profil, modifiable depuis /compte/profil : "+33 612345678" et "YYYY-MM-DD".
  phone: text("phone"),
  birthDate: text("birth_date"),
  // Mini tutoriel affiché une seule fois, à la première visite de l'espace.
  onboardedAt: integer("onboarded_at", { mode: "timestamp_ms" }),
  role: text("role").default("user"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
  ...timestamps,
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// --- Réservations ---------------------------------------------------------

// "proposed" : l'admin a proposé un autre créneau, en attente de la réponse du client.
export const bookingStatuses = ["pending", "confirmed", "cancelled", "proposed"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const booking = sqliteTable(
  "booking",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    service: text("service").notNull(),
    // Date et heures en heure de Paris, au format "YYYY-MM-DD" et "HH:MM".
    date: text("date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    status: text("status", { enum: bookingStatuses }).notNull().default("pending"),
    notes: text("notes"),
    // Autre créneau proposé par l'admin (statut "proposed") ; il remplace date / heures si le client accepte.
    proposedDate: text("proposed_date"),
    proposedStartTime: text("proposed_start_time"),
    proposedEndTime: text("proposed_end_time"),
    proposalNote: text("proposal_note"),
    // Rappel de la veille déjà envoyé (évite les doublons).
    reminderSentAt: integer("reminder_sent_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("booking_date_idx").on(t.date), index("booking_user_id_idx").on(t.userId)],
);

// Horaires d'ouverture hebdomadaires (0 = dimanche ... 6 = samedi).
export const availability = sqliteTable("availability", {
  weekday: integer("weekday").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

// --- Boutique -------------------------------------------------------------

export const productTypes = ["vst", "drumkit", "samplepack", "preset", "instrumental"] as const;
export type ProductType = (typeof productTypes)[number];

export const product = sqliteTable(
  "product",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    type: text("type", { enum: productTypes }).notNull(),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    genres: text("genres", { mode: "json" }).$type<string[]>().notNull().default([]),
    // Compatibilité des VST : plateformes ("windows", "mac") et formats ("vst3", "au"...).
    platforms: text("platforms", { mode: "json" }).$type<string[]>().notNull().default([]),
    formats: text("formats", { mode: "json" }).$type<string[]>().notNull().default([]),
    // Instrumentales : tempo et tonalité ("Am", "F# min"...).
    bpm: integer("bpm"),
    musicalKey: text("musical_key"),
    // Noms de fichiers dans storage/uploads, servis par /media/<fichier>.
    coverFile: text("cover_file"),
    previewFile: text("preview_file"),
    // Photos de la fiche produit, en plus du visuel principal.
    galleryFiles: text("gallery_files", { mode: "json" }).$type<string[]>().notNull().default([]),
    // Vidéo de présentation : lien YouTube ou fichier envoyé, jamais les deux.
    videoUrl: text("video_url"),
    videoFile: text("video_file"),
    // Fichier livré à l'acheteur (stockage privé, jamais servi par /media).
    downloadFile: text("download_file"),
    downloadName: text("download_name"),
    downloadSize: integer("download_size"),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index("product_type_idx").on(t.type)],
);

// --- Services et tarifs (modifiables depuis /admin/offres) ----------------

export const service = sqliteTable("service", {
  // Identifiant lisible ("mixing"), fixé à la création : les réservations y font référence.
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("sliders"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  bookable: integer("bookable", { mode: "boolean" }).notNull().default(true),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  position: integer("position").notNull().default(0),
});

export const plan = sqliteTable("plan", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  // Texte libre : "79 €", "Sur devis"...
  price: text("price").notNull(),
  unit: text("unit").notNull().default(""),
  description: text("description").notNull().default(""),
  features: text("features", { mode: "json" }).$type<string[]>().notNull().default([]),
  highlighted: integer("highlighted", { mode: "boolean" }).notNull().default(false),
  serviceId: text("service_id").references(() => service.id, { onDelete: "set null" }),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  position: integer("position").notNull().default(0),
});

// Petits réglages clé / valeur (ex : données par défaut déjà insérées).
export const setting = sqliteTable("setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// --- Dernières productions (section de l'accueil, gérée depuis /admin/productions)

export const production = sqliteTable("production", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  artist: text("artist").notNull().default(""),
  // Ton rôle sur le titre : "Mix & Master", "Prod", "Prise de voix"...
  role: text("role").notNull().default(""),
  coverFile: text("cover_file"),
  audioFile: text("audio_file"),
  // Lien d'écoute externe (Spotify, YouTube, SoundCloud...).
  link: text("link"),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  position: integer("position").notNull().default(0),
  ...timestamps,
});

// --- Commandes de la boutique ----------------------------------------------

export const orderStatuses = ["pending", "paid", "cancelled"] as const;
export const orderMethods = ["free", "transfer", "paypal"] as const;

export const shopOrder = sqliteTable(
  "shop_order",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Référence à recopier dans le libellé du virement.
    reference: text("reference").notNull().unique(),
    method: text("method", { enum: orderMethods }).notNull(),
    status: text("status", { enum: orderStatuses }).notNull().default("pending"),
    totalCents: integer("total_cents").notNull(),
    // Date du renoncement exprès au droit de rétractation (contenu numérique).
    withdrawalWaivedAt: integer("withdrawal_waived_at", { mode: "timestamp_ms" }),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("shop_order_user_id_idx").on(t.userId), index("shop_order_status_idx").on(t.status)],
);

export const shopOrderItem = sqliteTable(
  "shop_order_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("order_id")
      .notNull()
      .references(() => shopOrder.id, { onDelete: "cascade" }),
    // Le nom et le prix restent sur la commande même si le produit change ou disparaît.
    productId: text("product_id").references(() => product.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
  },
  (t) => [index("shop_order_item_order_id_idx").on(t.orderId), index("shop_order_item_product_id_idx").on(t.productId)],
);
