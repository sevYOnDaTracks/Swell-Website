// Réglages de l'accueil de la boutique (sans dépendance serveur : lu aussi dans l'admin).
// Bannière promo en haut des pages, annonces en grand en premier écran, nouveautés.

export type HomeSlide = {
  id: string;
  enabled: boolean;
  // Pastille au-dessus du titre : « Nouveau », « -30 % », « Mise à jour »...
  badge: string;
  title: string;
  text: string;
  ctaLabel: string;
  href: string;
  // Produit mis en avant : son visuel sert d'image si aucune image n'est envoyée.
  productId: string | null;
  // Image envoyée (storage/uploads), affichée en grand derrière le texte.
  imageFile: string | null;
  // Fin de l'annonce (ISO), vide = sans fin.
  endsAt: string | null;
};

export type HomeBar = { enabled: boolean; text: string; linkLabel: string; href: string; endsAt: string | null };

export type HomeSettings = {
  bar: HomeBar;
  slides: HomeSlide[];
  // Nouveautés choisies, dans l'ordre. Vide : les derniers plugins publiés.
  newProductIds: string[];
};

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  bar: { enabled: false, text: "", linkLabel: "", href: "", endsAt: null },
  slides: [],
  newProductIds: [],
};

export const newSlide = (): HomeSlide => ({
  id: "",
  enabled: true,
  badge: "Nouveau",
  title: "",
  text: "",
  ctaLabel: "Découvrir",
  href: "/boutique",
  productId: null,
  imageFile: null,
  endsAt: null,
});

/** Vrai si une date de fin (ISO) n'est pas encore passée. */
export const notEnded = (endsAt: string | null, now: number) => !endsAt || new Date(endsAt).getTime() > now;
