import { SHOP_URL } from "@/lib/sites";
import Link from "next/link";
import { LegalPage, Section, V } from "@/components/legal/LegalPage";
import { legal } from "@/lib/legal";

export const metadata = { title: "Conditions générales de vente — Swell", alternates: { canonical: `${SHOP_URL}/cgv` } };

export default function CgvPage() {
  return (
    <LegalPage title="Conditions générales de vente">
      <Section title="1. Objet">
        <p>
          Les présentes conditions régissent les prestations proposées par <V>{legal.owner}</V> sous la marque {legal.brand}{" "}
          sur le site {legal.site} : mixage et mastering, production et reproduction d&apos;instrumentales, prise de voix à
          distance, installation de plugins à distance, ainsi que la vente de produits numériques (VST, drum kits, sample
          packs, presets). Toute réservation ou commande implique leur acceptation.
        </p>
      </Section>

      <Section title="2. Compte client">
        <p>
          La réservation d&apos;une session et l&apos;achat de produits nécessitent un compte. Le client s&apos;engage à fournir
          des informations exactes et à garder son mot de passe confidentiel.
        </p>
      </Section>

      <Section title="3. Réservation des sessions">
        <p>
          Le client choisit un service, une date et un créneau. La demande est d&apos;abord « en attente », puis confirmée ou
          refusée par {legal.brand}. Le client est informé par email de chaque changement de statut.
        </p>
        <p>
          Le client peut annuler gratuitement une session depuis son espace jusqu&apos;à {legal.cancellationNotice} avant son
          début. {legal.brand} peut annuler une session en cas d&apos;empêchement ; le client en est prévenu par email et peut
          réserver un autre créneau.
        </p>
      </Section>

      <Section title="4. Prix et paiement">
        <p>
          Les prix sont indiqués en euros sur le site. <V>{legal.vat}</V>. Les prestations sur devis font l&apos;objet
          d&apos;une proposition écrite avant tout engagement.
        </p>
        <p>
          Les produits numériques se règlent par PayPal ou par virement bancaire, selon les moyens proposés lors de la
          commande, avec la référence indiquée. Ils sont mis à disposition dans l&apos;espace client après réception du paiement. Les modalités
          de paiement des sessions sont précisées lors de la confirmation.
        </p>
      </Section>

      <Section title="5. Réalisation des prestations">
        <p>
          Les fichiers nécessaires (pistes séparées, références, etc.) sont fournis par le client, qui garantit en détenir
          les droits. Le nombre de révisions inclus et le délai de livraison sont ceux indiqués dans la formule choisie.
        </p>
      </Section>

      <Section title="6. Produits numériques et licence">
        <p>
          L&apos;achat d&apos;un produit numérique donne droit à son téléchargement depuis l&apos;espace client et à une licence
          d&apos;utilisation personnelle, non exclusive et non transférable : les sons peuvent être utilisés librement dans
          des productions musicales, y compris commerciales. La revente, le partage ou la redistribution des fichiers, seuls
          ou intégrés à une autre banque de sons, sont interdits.
        </p>
        <p>
          La compatibilité (système et formats) est indiquée sur chaque fiche produit ; il appartient au client de la
          vérifier avant l&apos;achat.
        </p>
        <p>
          <strong>Abonnement Swell All Access.</strong> L&apos;abonnement donne accès, pendant la durée du pass acheté (1 mois de
          30 jours ou 1 an de 365 jours), au téléchargement et à l&apos;utilisation de tous les plugins Swell proposés dans
          l&apos;abonnement, aux mêmes conditions de licence que ci-dessus. Le pass est prépayé et ne se renouvelle pas
          automatiquement : aucun prélèvement n&apos;est effectué sans une nouvelle commande du client, qui peut donc arrêter
          à tout moment en ne renouvelant pas. L&apos;accès commence à la validation du paiement ; un pass acheté avant la fin
          de l&apos;accès en cours s&apos;ajoute à sa suite. À la fin de l&apos;accès, et après quelques jours de marge, les
          plugins de l&apos;abonnement cessent de fonctionner, sauf ceux achetés à l&apos;unité, qui restent acquis.
        </p>
        <p>
          Un essai gratuit peut être proposé aux nouveaux abonnés, une seule fois par compte et par ordinateur. Il ne se
          transforme jamais en abonnement payant sans commande du client. Swell peut faire évoluer la liste des plugins
          compris et le prix des pass ; un pass déjà payé reste valable au prix et pour la durée achetés.
        </p>
      </Section>

      <Section title="7. Droit de rétractation">
        <p>
          Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne peut pas être exercé :
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            pour un contenu numérique fourni sans support matériel dont le téléchargement a commencé, après accord exprès du
            client et renoncement exprès à son droit de rétractation ;
          </li>
          <li>pour une prestation de service pleinement exécutée avant la fin du délai de rétractation, avec l&apos;accord du client.</li>
        </ul>
        <p>Dans les autres cas, le client dispose de 14 jours pour se rétracter en écrivant à {legal.email}.</p>
      </Section>

      <Section title="8. Propriété intellectuelle des créations">
        <p>
          Sauf accord écrit contraire, les droits sur les instrumentales produites sur mesure sont cédés selon les conditions
          convenues lors du devis. Le client reste titulaire des droits sur ses propres enregistrements.
        </p>
      </Section>

      <Section title="9. Responsabilité">
        <p>
          {legal.brand} met tout en œuvre pour fournir des prestations de qualité. Sa responsabilité ne peut être engagée en
          cas de mauvaise utilisation des fichiers, d&apos;incompatibilité non signalée sur la fiche produit, ou
          d&apos;interruption due à un tiers (hébergeur, fournisseur d&apos;accès).
        </p>
      </Section>

      <Section title="10. Données personnelles">
        <p>
          Voir la{" "}
          <Link href="/confidentialite" className="underline underline-offset-4">
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>

      <Section title="11. Litiges">
        <p>
          Les présentes conditions sont soumises au droit français. En cas de litige, le client peut écrire à {legal.email}{" "}
          pour trouver une solution amiable. À défaut, il peut recourir gratuitement au médiateur de la consommation :{" "}
          <V>{legal.mediator}</V>, ou à la plateforme européenne de règlement des litiges en ligne.
        </p>
      </Section>
    </LegalPage>
  );
}
