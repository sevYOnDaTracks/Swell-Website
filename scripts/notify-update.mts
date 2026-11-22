// Envoie le mail « mise à jour disponible » d'un produit à ses acheteurs et testeurs,
// quand son fichier livré a été remplacé directement sur le serveur (sans l'upload de l'admin).
//
//   node scripts/notify-update.mts <slug> --dry-run      # liste les destinataires, n'envoie rien
//   node scripts/notify-update.mts <slug>                # envoie (une fois par version)
//   node scripts/notify-update.mts <slug> --version "Swell Realistic Guitar 1.0.2.pkg"
//   node scripts/notify-update.mts <slug> --force        # renvoie même si la version a déjà été annoncée
//
// À lancer sur le serveur depuis le dossier de l'appli, comme send-reminders.sh :
// lit CRON_SECRET (et SITE_URL, défaut http://localhost:3000) dans l'environnement ou dans .env.
import { existsSync, readFileSync } from "node:fs";

function fromDotEnv(name: string) {
  if (!existsSync(".env")) return undefined;
  const line = readFileSync(".env", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
}

const args = process.argv.slice(2);
const slug = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--version");
const versionIndex = args.indexOf("--version");
const version = versionIndex >= 0 ? args[versionIndex + 1] : undefined;
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");

if (!slug) {
  console.error("Usage : node scripts/notify-update.mts <slug> [--dry-run] [--version <nom>] [--force]");
  process.exit(1);
}
const secret = process.env.CRON_SECRET ?? fromDotEnv("CRON_SECRET");
if (!secret) {
  console.error("CRON_SECRET introuvable (environnement ou .env).");
  process.exit(1);
}
const base = process.env.SITE_URL ?? `http://localhost:${process.env.PORT ?? fromDotEnv("PORT") ?? 3000}`;

const res = await fetch(`${base}/api/cron/notify-update`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  body: JSON.stringify({ slug, version, dryRun, force }),
});
const raw = await res.text();
let data;
try {
  data = JSON.parse(raw);
} catch {
  data = { error: raw };
}
if (!res.ok) {
  console.error(`Échec (${res.status}) :`, data.error ?? data);
  process.exit(1);
}
const count = data.recipients.length;
if (data.dryRun) console.log(`[test] ${data.product} — ${data.version} : ${count} destinataire(s), rien envoyé.`);
else if (data.skipped) console.log(`${data.product} — ${data.version} : déjà annoncée, rien envoyé (--force pour renvoyer).`);
else console.log(`${data.product} — ${data.version} : mail envoyé à ${count} adresse(s).`);
for (const email of data.recipients) console.log(`  ${email}`);
