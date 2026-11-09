// Textes fixes de la landing page. Les services et les tarifs se gèrent
// depuis /admin/offres, les produits depuis /admin/produits.

import type { Site } from "./sites";

// Menus des deux sites (voir src/lib/sites.ts). Aucun lien de l'un vers l'autre : seuls le compte et l'admin sont communs.
export const navLinksBySite: Record<Site, { label: string; href: string }[]> = {
  shop: [
    { label: "Plugins & sons", href: "/boutique" },
    { label: "Installer un plugin", href: "/boutique/aide" },
    { label: "FAQ", href: "/#faq" },
  ],
  mix: [
    { label: "Productions", href: "/#productions" },
    { label: "Services", href: "/#services" },
    { label: "Instrumentales", href: "/instrumentales" },
    { label: "Tarifs", href: "/#tarifs" },
    { label: "FAQ", href: "/#faq" },
  ],
};

// Logiciels affichés sous l'accroche. "wordmark" : le logo contient déjà le nom ;
// "icon" : petit logo suivi du nom ; sans logo : nom seul.
// Les logos (public/daws) viennent de Wikimedia Commons et Simple Icons.
export const daws: { name: string; logo?: string; kind?: "wordmark" | "icon"; ratio?: number; image?: boolean }[] = [
  { name: "FL Studio", logo: "/daws/fl-studio-icon.png", kind: "icon", image: true },
  { name: "Ableton Live", logo: "/daws/ableton.svg", kind: "wordmark", ratio: 160 / 28 },
  { name: "Logic Pro", logo: "/daws/logic-pro.png", kind: "icon", image: true },
  { name: "Pro Tools", logo: "/daws/pro-tools.svg", kind: "icon" },
  { name: "Cubase", logo: "/daws/cubase.svg", kind: "wordmark", ratio: 1729 / 486 },
  { name: "Studio One" },
];

// Lecteur avant / après de l'accueil : la même voix brute puis mixée.
// Dépose les deux fichiers dans public/hero/ (MP3 conseillé, même durée et même début)
// puis renseigne-les ici. Tant que c'est null, l'accueil affiche l'onde animée.
export const heroDemo: { title: string; artist: string; before: string; after: string } | null = null;
// Exemple :
// export const heroDemo = { title: "Nom du titre", artist: "Artiste", before: "/hero/avant.mp3", after: "/hero/apres.mp3" };

export const steps = [
  { title: "Crée ton compte", description: "En 30 secondes, pour suivre tes projets et tes achats." },
  { title: "Réserve ton créneau", description: "Choisis le service et la date qui te conviennent." },
  { title: "Reçois ton son", description: "Fichiers livrés dans ton espace, révisions incluses." },
];

// FAQ du site des services (mix.swell-audio.fr).
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
    a: "On prend un créneau, tu installes AnyDesk (gratuit) et, avec ton accord, je me connecte à ton ordinateur pour installer et configurer tes plugins.",
  },
];

// FAQ de la boutique (swell-audio.fr).
export const shopFaq = [
  {
    q: "Comment j'active un plugin ?",
    a: "Après l'achat, ta clé de licence est dans ton espace et dans l'email de confirmation. Colle-la dans le plugin au premier lancement : internet n'est nécessaire qu'une fois, ensuite il marche hors ligne.",
  },
  {
    q: "Sur combien d'ordinateurs ?",
    a: "Une licence s'active sur 3 ordinateurs. Pour changer de machine, retire l'ancienne depuis ton espace.",
  },
  {
    q: "Je peux essayer avant d'acheter ?",
    a: "Oui, quand le plugin le propose : bouton « Essayer » sur sa fiche, avec un compte gratuit. Si tu l'achètes ensuite, ta clé d'essai devient définitive.",
  },
  {
    q: "Quels logiciels sont compatibles ?",
    a: "VST3 sur Windows et Mac, AU sur Mac (Logic Pro), et une version Standalone. FL Studio, Ableton Live, Logic Pro, Studio One, Cubase, Reaper…",
  },
  {
    q: "Les sons sont-ils libres de droits ?",
    a: "Oui, tous les sons de la boutique sont utilisables dans tes productions commerciales.",
  },
];
