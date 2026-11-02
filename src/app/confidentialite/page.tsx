import { LegalPage, Section, V } from "@/components/legal/LegalPage";
import { legal } from "@/lib/legal";

export const metadata = { title: "Politique de confidentialité — Swell" };

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <Section title="Responsable du traitement">
        <p>
          <V>{legal.owner}</V>, {legal.brand}, <V>{legal.address}</V> — {legal.email}.
        </p>
      </Section>

      <Section title="Données collectées">
        <ul className="list-disc space-y-1 pl-5">
          <li>Compte : nom ou nom d&apos;artiste, adresse email, mot de passe (stocké chiffré, jamais lisible).</li>
          <li>Connexion avec Google : nom, email et photo de profil transmis par Google.</li>
          <li>Réservations : service, date, créneau et message laissé lors de la réservation.</li>
          <li>Achats (à venir) : produits achetés et historique de téléchargement.</li>
          <li>Données techniques : adresse IP et navigateur, utilisés pour la sécurité des connexions.</li>
        </ul>
      </Section>

      <Section title="Pourquoi et sur quelle base">
        <ul className="list-disc space-y-1 pl-5">
          <li>Gérer ton compte, tes réservations et tes achats (exécution du contrat).</li>
          <li>T&apos;envoyer les emails liés à ton compte : confirmations, rappels, mot de passe (exécution du contrat).</li>
          <li>Sécuriser le site et prévenir les abus (intérêt légitime).</li>
          <li>Respecter nos obligations comptables et fiscales (obligation légale).</li>
        </ul>
        <p>Aucune donnée n&apos;est vendue ni utilisée à des fins publicitaires.</p>
      </Section>

      <Section title="Durée de conservation">
        <p>
          Les données du compte sont conservées tant que le compte est actif, puis supprimées après 3 ans sans connexion.
          Les données de facturation sont conservées 10 ans, comme l&apos;exige la loi.
        </p>
      </Section>

      <Section title="Qui y a accès">
        <p>Seul {legal.brand} accède à tes données, ainsi que les prestataires techniques nécessaires au service :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{legal.host.name} : hébergement du site et des données (serveur situé en France).</li>
          <li>Resend : envoi des emails (peut impliquer un transfert hors UE, encadré par des clauses contractuelles types).</li>
          <li>Google : uniquement si tu choisis la connexion avec Google.</li>
          <li>Prestataire de paiement (à venir) : traitement sécurisé des paiements, sans accès de {legal.brand} à tes données bancaires.</li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          Le site n&apos;utilise qu&apos;un cookie strictement nécessaire : celui qui te garde connecté à ton compte. Aucun
          cookie publicitaire ou de mesure d&apos;audience n&apos;est déposé, c&apos;est pourquoi aucun bandeau de
          consentement n&apos;est affiché.
        </p>
      </Section>

      <Section title="Tes droits">
        <p>
          Tu peux accéder à tes données, les rectifier, les supprimer, t&apos;opposer à leur traitement ou demander leur
          portabilité en écrivant à {legal.email}. Tu peux aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </p>
      </Section>
    </LegalPage>
  );
}
