import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Apple, Download, KeyRound, Laptop, MonitorCheck, Plus, RefreshCw } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { CopyCommand } from "@/components/shop/CopyCommand";
import { legal } from "@/lib/legal";

export const metadata = {
  title: "Installer et activer un plugin — Swell",
  description: "Télécharger, installer sur Mac ou Windows, faire apparaître le plugin dans ton logiciel et coller ta clé de licence.",
};

const steps = [
  { id: "telecharger", label: "Télécharger", Icon: Download },
  { id: "installer", label: "Installer", Icon: Laptop },
  { id: "daw", label: "Trouver dans le logiciel", Icon: RefreshCw },
  { id: "activer", label: "Activer la clé", Icon: KeyRound },
  { id: "ordinateurs", label: "Changer d'ordinateur", Icon: MonitorCheck },
];

const faq: { q: string; a: ReactNode }[] = [
  {
    q: "macOS dit que le plugin est endommagé ou ne peut pas être ouvert",
    a: (
      <>
        Ça arrive surtout avec une ancienne version installée à la main. Ouvre l&apos;app Terminal, colle cette commande,
        appuie sur Entrée et tape ton mot de passe Mac (rien ne s&apos;affiche pendant que tu tapes, c&apos;est normal), puis
        relance ton logiciel :
        <CopyCommand>sudo xattr -dr com.apple.quarantine /Library/Audio/Plug-Ins/VST3 /Library/Audio/Plug-Ins/Components</CopyCommand>
      </>
    ),
  },
  {
    q: "Le plugin n'apparaît pas dans mon logiciel",
    a: (
      <>
        Relance la recherche des plugins (voir <a href="#daw" className="underline">Trouver dans le logiciel</a>). Sur Mac,
        vérifie que tu n&apos;as pas décoché le format de ton logiciel pendant l&apos;installation : Logic Pro utilise
        l&apos;Audio Unit, les autres le VST3. Relancer l&apos;installateur ne fait rien perdre.
      </>
    ),
  },
  {
    q: "Ctrl+V ou Cmd+V ne colle pas ma clé",
    a: "Certains logiciels gardent le clavier pour eux. Fais un clic droit dans le champ de la clé, puis Coller.",
  },
  {
    q: "« Cette licence est déjà activée sur 3 ordinateurs »",
    a: (
      <>
        Retire un ancien ordinateur depuis <Link href="/compte/plugins" className="underline">Mon espace &gt; Mes plugins</Link>,
        puis clique à nouveau sur Activer dans le plugin.
      </>
    ),
  },
  {
    q: "« Impossible de joindre swell-audio.fr »",
    a: "L'activation a besoin d'internet une seule fois. Vérifie ta connexion (et ton pare-feu ou antivirus), puis réessaie. Ensuite, le plugin marche hors ligne.",
  },
  {
    q: "Le son est coupé",
    a: "Le plugin n'est pas activé, ou ton essai est terminé. Clique sur le bandeau en bas du plugin pour coller ta clé. Si tu viens d'acheter après un essai, clique simplement sur Activer : ta clé d'essai est devenue définitive.",
  },
];

function Step({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-white/5 bg-surface p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-black">{n}</span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-foreground/85">{children}</div>
    </section>
  );
}

function Platform({ title, Icon, children }: { title: string; Icon: ComponentType<{ size?: number }>; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-background/40 p-4 sm:p-5">
      <p className="flex items-center gap-2 font-semibold">
        <Icon size={17} /> {title}
      </p>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/85">{children}</div>
    </div>
  );
}

function WindowsIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.5 10.5 4.4v7.1H3zM11.5 4.3 21 3v8.5h-9.5zM3 12.5h7.5v7.1L3 18.5zM11.5 12.5H21V21l-9.5-1.3z" />
    </svg>
  );
}

export default function PluginHelpPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-white/5">
          <div className="mx-auto max-w-3xl px-4 pb-10 pt-16 sm:px-6">
            <p className="text-sm font-medium text-accent">
              <Link href="/boutique" className="hover:underline">
                Plugins
              </Link>{" "}
              · Aide
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Installer et activer ton plugin</h1>
            <p className="mt-3 max-w-xl text-muted">
              C&apos;est pareil pour tous les plugins Swell : un installateur à lancer, une clé à coller. Internet est nécessaire une seule fois, pour l&apos;activation.
            </p>
            <nav className="mt-8 flex flex-wrap gap-2" aria-label="Étapes">
              {steps.map(({ id, label, Icon }, i) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/10 hover:text-foreground"
                >
                  <Icon size={14} /> {i + 1}. {label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 sm:px-6">
          <Step id="telecharger" n={1} title="Télécharger">
            <p>
              Va dans <Link href="/compte/plugins" className="font-medium underline">Mon espace &gt; Mes plugins</Link> et clique
              sur <strong>Mac</strong> ou <strong>Windows</strong> : tu reçois l&apos;installateur du plugin dans un fichier{" "}
              <strong>.zip</strong> (certains navigateurs bloquent les installateurs téléchargés directement).
            </p>
            <p>
              Double-clique sur le <strong>.zip</strong> pour le décompresser (sur Windows : clic droit &gt;{" "}
              <strong>Extraire tout</strong>). Tu obtiens l&apos;installateur : un fichier <strong>.pkg</strong> sur Mac,{" "}
              <strong>.exe</strong> sur Windows.
            </p>
            <p>
              Ta <strong>clé de licence</strong> est juste en dessous, et aussi dans l&apos;e-mail de confirmation de ta commande.
            </p>
          </Step>

          <Step id="installer" n={2} title="Installer">
            <p>
              Double-clique sur l&apos;installateur et laisse-toi guider : il place le plugin au bon endroit tout seul. Tu
              n&apos;as aucun fichier à déplacer.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Platform title="Mac" Icon={Apple}>
                <p>
                  Les plugins Swell ne sont pas encore validés par Apple : la première fois, macOS refuse d&apos;ouvrir
                  l&apos;installateur. C&apos;est normal :
                </p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>clique sur <strong>OK</strong> dans le message de macOS ;</li>
                  <li>
                    ouvre <strong>Réglages Système &gt; Confidentialité et sécurité</strong> et descends tout en bas ;
                  </li>
                  <li>
                    clique sur <strong>Ouvrir quand même</strong> à côté du nom de l&apos;installateur, puis tape ton mot de passe
                    Mac.
                  </li>
                </ol>
                <p className="text-muted">
                  L&apos;installateur pose le VST3 (FL Studio, Ableton…), l&apos;Audio Unit (Logic Pro, GarageBand) et
                  l&apos;application autonome. Tu peux décocher ce dont tu n&apos;as pas besoin.
                </p>
              </Platform>
              <Platform title="Windows" Icon={WindowsIcon}>
                <p>
                  Si Windows affiche <strong>« Windows a protégé votre ordinateur »</strong> : clique sur{" "}
                  <strong>Informations complémentaires</strong>, puis <strong>Exécuter quand même</strong>. Accepte ensuite la
                  demande d&apos;autorisation.
                </p>
                <p className="text-muted">
                  Le plugin VST3 va dans C:\Program Files\Common Files\VST3, et l&apos;application autonome dans le menu
                  Démarrer (dossier Swell Audio).
                </p>
                <p className="text-muted">
                  Pour le désinstaller : Paramètres &gt; Applications, cherche le nom du plugin.
                </p>
              </Platform>
            </div>
          </Step>

          <Step id="daw" n={3} title="Le faire apparaître dans ton logiciel">
            <p>Ferme et rouvre ton logiciel, puis lance une recherche des plugins si le nouveau n&apos;apparaît pas :</p>
            <ul className="space-y-2">
              <li className="rounded-lg bg-white/[0.03] px-3 py-2">
                <strong>FL Studio</strong> : Options &gt; Manage plugins &gt; <em>Find installed plugins</em>.
              </li>
              <li className="rounded-lg bg-white/[0.03] px-3 py-2">
                <strong>Ableton Live</strong> : Réglages &gt; Plug-ins, active <em>Use VST3 Plug-in System Folders</em>, puis{" "}
                <em>Rescan</em>.
              </li>
              <li className="rounded-lg bg-white/[0.03] px-3 py-2">
                <strong>Logic Pro</strong> : le plugin est vérifié tout seul au lancement. S&apos;il est marqué en échec : Logic Pro
                &gt; Réglages &gt; Gestionnaire de modules, sélectionne-le et clique sur <em>Réinitialiser et réanalyser</em>.
              </li>
            </ul>
            <p className="text-muted">Les plugins d&apos;instrument (Log Drums, The Percussionist…) se chargent comme instrument, pas comme effet.</p>
          </Step>

          <Step id="activer" n={4} title="Activer ta clé de licence">
            <p>
              Au premier lancement, le plugin affiche un écran <strong>Activation</strong>. Colle ta clé (elle ressemble à{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-sm">SWELL-XXXXX-XXXXX-XXXXX-XXXXX</code>), puis
              clique sur <strong>Activer</strong>.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Internet est nécessaire uniquement à ce moment-là. Ensuite, le plugin marche hors ligne.</li>
              <li>Une fois activé, « Licence : ton nom » s&apos;affiche en bas du plugin.</li>
              <li>Si Ctrl+V ou Cmd+V ne marche pas : clic droit dans le champ, puis Coller.</li>
            </ul>
            <div className="rounded-xl border border-white/5 bg-background/40 p-4 text-sm">
              <p className="font-semibold">Essai gratuit</p>
              <p className="mt-1 text-foreground/85">
                Lance l&apos;essai depuis la page du plugin dans la <Link href="/boutique" className="underline">boutique</Link>{" "}
                (un compte gratuit suffit) et colle ta clé d&apos;essai de la même façon. À la fin de l&apos;essai, le son se coupe.
                Si tu achètes le plugin, la même clé devient définitive : clique simplement sur Activer.
              </p>
            </div>
          </Step>

          <Step id="ordinateurs" n={5} title="Changer d'ordinateur">
            <p>
              Une licence s&apos;active sur <strong>3 ordinateurs</strong>. Pour libérer une place :
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                dans le plugin, clique sur « Licence : ton nom » en bas, puis <em>Désactiver sur cet ordinateur</em> ;
              </li>
              <li>
                ou, si tu n&apos;as plus l&apos;ancien ordinateur, retire-le depuis{" "}
                <Link href="/compte/plugins" className="underline">Mon espace &gt; Mes plugins</Link>.
              </li>
            </ul>
          </Step>

          <section id="problemes" className="scroll-mt-24 pt-6">
            <h2 className="text-xl font-semibold tracking-tight">Un souci ?</h2>
            <div className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/5 bg-surface">
              {faq.map((item) => (
                <details key={item.q} className="group px-5 py-4 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <Plus size={18} className="shrink-0 text-muted transition-transform group-open:rotate-45" />
                  </summary>
                  <div className="mt-3 text-sm leading-relaxed text-muted">{item.a}</div>
                </details>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted">
              Toujours bloqué ? Écris à{" "}
              <a href={`mailto:${legal.email}`} className="text-foreground underline">
                {legal.email}
              </a>{" "}
              avec le nom du plugin, ton système (Mac ou Windows) et ton logiciel de musique.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
