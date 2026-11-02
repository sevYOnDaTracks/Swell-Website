// Textes fixes de la landing page. Les services et les tarifs se gèrent
// depuis /admin/offres, les produits depuis /admin/produits.

export const navLinks = [
  { label: "Services", href: "/#services" },
  { label: "Boutique", href: "/boutique" },
  { label: "Tarifs", href: "/#tarifs" },
  { label: "FAQ", href: "/#faq" },
];

export const daws = ["FL Studio", "Ableton Live", "Logic Pro", "Pro Tools", "Cubase", "Studio One"];

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
