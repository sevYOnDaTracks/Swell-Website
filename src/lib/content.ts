// Tout le texte de la landing page est ici : modifie ce fichier pour changer
// les services, les prix, les produits ou la FAQ sans toucher aux composants.

export const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Boutique", href: "#boutique" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "FAQ", href: "#faq" },
];

export const daws = ["FL Studio", "Ableton Live", "Logic Pro", "Pro Tools", "Cubase", "Studio One"];

export const services = [
  {
    icon: "sliders",
    title: "Mixing & Mastering",
    description: "Un mix propre, large et punchy, prêt pour Spotify, Apple Music et les clubs.",
  },
  {
    icon: "music",
    title: "Prod / Reprod",
    description: "Une instru sur mesure, ou la reprod fidèle d'un son de référence.",
  },
  {
    icon: "mic",
    title: "Prise de voix à distance",
    description: "Session guidée en live : tu enregistres chez toi, je pilote la prise.",
  },
  {
    icon: "plug",
    title: "Installation de plugins",
    description: "J'installe et je configure tes VST à distance, sans prise de tête.",
  },
] as const;

export const steps = [
  { title: "Crée ton compte", description: "En 30 secondes, pour suivre tes projets et tes achats." },
  { title: "Réserve ton créneau", description: "Choisis le service et la date qui te conviennent." },
  { title: "Reçois ton son", description: "Fichiers livrés dans ton espace, révisions incluses." },
];

export const products = [
  { name: "Swell Drums Vol. 1", type: "Drum kit", detail: "120+ one-shots & loops", price: "29 €" },
  { name: "Night Keys", type: "VST", detail: "Synthé ambient & pads", price: "49 €" },
  { name: "808 Lab", type: "Drum kit", detail: "60 808 calibrées", price: "19 €" },
];

export const plans = [
  {
    name: "Mix",
    service: "mixing",
    price: "79 €",
    unit: "/ titre",
    description: "Pour un son propre et équilibré.",
    features: ["Mix jusqu'à 32 pistes", "2 révisions", "Livraison sous 5 jours"],
    highlighted: false,
  },
  {
    name: "Mix + Master",
    service: "mixing",
    price: "119 €",
    unit: "/ titre",
    description: "Le pack complet, prêt à sortir.",
    features: ["Mix illimité en pistes", "Mastering streaming", "3 révisions", "Livraison sous 4 jours"],
    highlighted: true,
  },
  {
    name: "Prod / Reprod",
    service: "prod",
    price: "Sur devis",
    unit: "",
    description: "Une instru pensée pour ton projet.",
    features: ["Brief en visio", "Stems fournis", "Droits selon licence"],
    highlighted: false,
  },
];

export const faq = [
  {
    q: "Comment se passe une prise de voix à distance ?",
    a: "On se connecte en visio, tu enregistres chez toi pendant que je t'écoute et te guide en direct. Je récupère les pistes et je m'occupe du reste.",
  },
  {
    q: "Quels fichiers dois-je envoyer pour un mix ?",
    a: "Les pistes séparées (stems) en WAV, sans effets sur le master, et une référence si tu en as une.",
  },
  {
    q: "Comment fonctionne l'installation de plugins à distance ?",
    a: "On prend un créneau, je me connecte à ton ordinateur avec ton accord via un logiciel de prise en main, et j'installe / configure tes plugins.",
  },
  {
    q: "Les VST et drum kits sont-ils libres de droits ?",
    a: "Oui, tous les sons de la boutique sont utilisables dans tes productions commerciales.",
  },
];

// Services réservables en ligne : la durée (en minutes) bloque le créneau.
export const bookingServices = [
  { id: "mixing", label: "Mixing & Mastering", duration: 60, description: "Session d'écoute et brief de ton mix." },
  { id: "prod", label: "Prod / Reprod", duration: 120, description: "Session de prod sur mesure ou reprod." },
  { id: "voix", label: "Prise de voix à distance", duration: 120, description: "Enregistrement guidé en visio." },
  { id: "plugins", label: "Installation de plugins", duration: 60, description: "Installation et config de tes VST." },
] as const;

export type BookingServiceId = (typeof bookingServices)[number]["id"];
