// Génère la paire de clés Ed25519 des licences. À lancer UNE SEULE FOIS :
//   node scripts/license-keygen.mjs
// - LICENSE_PRIVATE_KEY va dans le .env du serveur (jamais dans git, jamais dans un plugin).
// - La clé publique est à recopier dans le module de licence des plugins.
// Changer de paire invalide toutes les licences déjà activées.
import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateB64 = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
const publicRaw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);

console.log("# À ajouter au .env du serveur :");
console.log(`LICENSE_PRIVATE_KEY=${privateB64}`);
console.log("");
console.log("# Clé publique pour les plugins (hexadécimal, 32 octets) :");
console.log(publicRaw.toString("hex"));
console.log("");
console.log("# Même clé, en tableau C++ :");
console.log(`{ ${Array.from(publicRaw, (b) => `0x${b.toString(16).padStart(2, "0")}`).join(", ")} }`);
