// Informations légales affichées dans les mentions légales, les CGV et la
// politique de confidentialité. Remplace chaque valeur TODO par la tienne :
// tant qu'une valeur commence par "TODO", elle s'affiche surlignée sur le site.
// À faire valider par un comptable ou un juriste.

export const legal = {
  brand: "Swell",
  site: "swell-audio.fr",
  owner: "TODO Nom et prénom (ou nom de la société)",
  status: "TODO Statut (ex : micro-entreprise / entrepreneur individuel)",
  siret: "TODO Numéro SIRET",
  address: "TODO Adresse postale",
  email: "contact@swell-audio.fr",
  phone: "TODO Téléphone (facultatif)",
  // Micro-entreprise en franchise de TVA : « TVA non applicable, art. 293 B du CGI ».
  vat: "TODO Mention TVA (ex : TVA non applicable, art. 293 B du CGI)",
  host: {
    name: "Hostinger International Ltd",
    address: "61 Lordou Vironos Street, 6023 Larnaca, Chypre",
    site: "www.hostinger.fr",
  },
  // Délai pour annuler une session sans frais.
  cancellationNotice: "24 heures",
  // Médiateur de la consommation (obligatoire pour vendre à des particuliers).
  mediator: "TODO Nom et site du médiateur de la consommation",
  lastUpdate: "6 novembre 2026",
};

export const isTodo = (value: string) => value.startsWith("TODO");
