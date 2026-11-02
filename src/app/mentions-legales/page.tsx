import Link from "next/link";
import { LegalPage, Section, V } from "@/components/legal/LegalPage";
import { legal } from "@/lib/legal";

export const metadata = { title: "Mentions légales — Swell" };

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <Section title="Éditeur du site">
        <p>
          Le site {legal.site} est édité par <V>{legal.owner}</V>, <V>{legal.status}</V>.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            SIRET : <V>{legal.siret}</V>
          </li>
          <li>
            Adresse : <V>{legal.address}</V>
          </li>
          <li>Email : {legal.email}</li>
          <li>
            Téléphone : <V>{legal.phone}</V>
          </li>
          <li>
            <V>{legal.vat}</V>
          </li>
        </ul>
        <p>
          Directeur de la publication : <V>{legal.owner}</V>.
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Le site est hébergé par {legal.host.name}, {legal.host.address} ({legal.host.site}).
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des contenus du site (textes, logos, visuels, extraits audio, productions, VST et banques de sons)
          est la propriété de {legal.brand} ou de ses partenaires. Toute reproduction ou diffusion sans autorisation écrite
          est interdite, sauf dans le cadre de la licence accordée lors d&apos;un achat (voir les{" "}
          <Link href="/cgv" className="underline underline-offset-4">
            conditions générales de vente
          </Link>
          ).
        </p>
        <p>
          Les logos des logiciels cités (FL Studio, Ableton, Logic Pro, Pro Tools, Cubase, Studio One) appartiennent à leurs
          éditeurs respectifs et ne sont utilisés qu&apos;à titre d&apos;information.
        </p>
      </Section>

      <Section title="Données personnelles">
        <p>
          Le traitement de tes données est décrit dans la{" "}
          <Link href="/confidentialite" className="underline underline-offset-4">
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
