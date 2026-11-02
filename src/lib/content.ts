// Textes fixes de la landing page. Les services et les tarifs se gèrent
// depuis /admin/offres, les produits depuis /admin/produits.

export const navLinks = [
  { label: "Productions", href: "/#productions" },
  { label: "Services", href: "/#services" },
  { label: "Boutique", href: "/boutique" },
  { label: "Tarifs", href: "/#tarifs" },
  { label: "FAQ", href: "/#faq" },
];

// Logiciels affichés sous l'accroche. "wordmark" : le logo contient déjà le nom ;
// "icon" : petit logo suivi du nom ; sans logo : nom seul.
// Les logos (public/daws) viennent de Wikimedia Commons et Simple Icons.
export const daws: { name: string; logo?: string; kind?: "wordmark" | "icon"; ratio?: number; image?: boolean }[] = [
  { name: "FL Studio", logo: "/daws/fl-studio.svg", kind: "wordmark", ratio: 1493 / 253 },
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
