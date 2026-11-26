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

// Grand bandeau « campagne » tout en haut de l'accueil (Black Friday, sortie...), au-dessus des annonces.
export type HomeCampaign = {
  enabled: boolean;
  // Pastille au-dessus du titre (« C'est parti ! ») et grand titre (« Black Friday »).
  title: string;
  subtitle: string;
  // Ligne au-dessus du prix (« 27 plugins à »), prix géant (« 19,99 € ») et mot après (« chacun »).
  lead: string;
  price: string;
  priceNote: string;
  // Offres sous le prix (« 3 plugins pour 39 € »), 3 au maximum.
  offers: string[];
  ctaLabel: string;
  href: string;
  // Conditions en petit sous le bouton.
  fineprint: string;
  // Image de fond envoyée ; sans image, une mosaïque des visuels des plugins.
  imageFile: string | null;
  endsAt: string | null;
};

export const DEFAULT_CAMPAIGN: HomeCampaign = {
  enabled: false,
  title: "Black Friday",
  subtitle: "",
  lead: "",
  price: "",
  priceNote: "",
  offers: [],
  ctaLabel: "Voir la promo",
  href: "/boutique",
  fineprint: "",
  imageFile: null,
  endsAt: null,
};

export type HomeBar = { enabled: boolean; text: string; linkLabel: string; href: string; endsAt: string | null };

export type HomeSettings = {
  campaign: HomeCampaign;
  bar: HomeBar;
  slides: HomeSlide[];
  // Nouveautés choisies, dans l'ordre. Vide : les derniers plugins publiés.
  newProductIds: string[];
};

export const DEFAULT_HOME_SETTINGS: HomeSettings = {
  campaign: DEFAULT_CAMPAIGN,
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
