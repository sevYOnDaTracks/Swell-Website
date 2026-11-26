// Support : libellés partagés (serveur et navigateur).

import type { SupportStatus, SupportSubject } from "@/db/schema";

export const SUPPORT_SUBJECTS: { value: SupportSubject; label: string; hint: string }[] = [
  { value: "avant-achat", label: "Question avant achat", hint: "Compatibilité, prix, différences entre plugins…" },
  { value: "licence", label: "Activation / licence", hint: "Clé refusée, nombre d'ordinateurs, changement de machine…" },
  { value: "paiement", label: "Paiement / commande", hint: "Paiement envoyé, commande en attente, référence…" },
  { value: "abonnement", label: "Abonnement", hint: "Essai, renouvellement, formule…" },
  { value: "plugin", label: "Problème avec un plugin", hint: "Installation, plantage, son, DAW…" },
  { value: "autre", label: "Autre", hint: "Tout le reste." },
];

export const subjectLabel = (s: string) => SUPPORT_SUBJECTS.find((x) => x.value === s)?.label ?? s;

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: "En attente de Swell",
  answered: "Réponse reçue",
  closed: "Résolue",
};

// Réponses types proposées dans l'admin (modifiables avant l'envoi).
export const CANNED_REPLIES = [
  {
    label: "Activer sa licence",
    text: "Bonjour,\n\nTa clé de licence se trouve dans ton espace (Mes plugins) et dans l'email de confirmation. Ouvre le plugin dans ton logiciel, colle la clé dans la fenêtre d'activation, puis valide : internet n'est nécessaire qu'une seule fois.\n\nLe guide pas à pas est ici : https://swell-audio.fr/boutique/aide\n\nDis-moi si ça bloque encore,\nSwell",
  },
  {
    label: "Paiement bien reçu",
    text: "Bonjour,\n\nTon paiement est bien reçu et ta commande est validée. Tes fichiers et tes clés sont dans ton espace, rubrique Mes plugins.\n\nBonne musique,\nSwell",
  },
  {
    label: "Changer d'ordinateur",
    text: "Bonjour,\n\nChaque licence s'active sur 3 ordinateurs. Pour en libérer un, va dans ton espace, rubrique Mes plugins, et clique sur « Retirer » à côté de l'ordinateur que tu n'utilises plus. Tu pourras ensuite activer le plugin sur le nouveau.\n\nSwell",
  },
  {
    label: "Plugin non détecté",
    text: "Bonjour,\n\nAprès l'installation, relance ton logiciel de musique et lance un nouveau scan des plugins. Sur Mac, le plugin se trouve dans /Library/Audio/Plug-Ins (VST3 et Components) ; sur Windows, dans C:\\Program Files\\Common Files\\VST3.\n\nTu peux me dire quel logiciel et quel système tu utilises si ça ne marche toujours pas ?\n\nSwell",
  },
];
