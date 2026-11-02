import "server-only";

// Envoi d'emails via l'API Resend (https://resend.com), sans dépendance.
// Sans RESEND_API_KEY (développement, ou avant configuration), les emails
// sont seulement écrits dans les journaux du serveur : rien ne casse.

export const SITE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "Swell <contact@swell-audio.fr>";

/** Adresse qui reçoit les alertes (réservations...) : ADMIN_NOTIFY_EMAIL, sinon le premier admin. */
export const ADMIN_NOTIFY_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL ?? (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() ?? "";

type Email = { to: string; subject: string; title: string; paragraphs: string[]; cta?: { label: string; href: string } };

export async function sendEmail(email: Email) {
  if (!email.to) return;
  const html = renderHtml(email);
  const text = [email.title, "", ...email.paragraphs, email.cta ? `\n${email.cta.label} : ${email.cta.href}` : ""].join("\n");

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email non envoyé : RESEND_API_KEY absente] à ${email.to} — ${email.subject}\n${text}`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email.to], subject: email.subject, html, text }),
    });
    if (!res.ok) console.error(`[email] échec ${res.status} pour ${email.to} : ${await res.text()}`);
  } catch (e) {
    // Un email raté ne doit jamais faire échouer l'action de l'utilisateur.
    console.error(`[email] erreur réseau pour ${email.to}`, e);
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Gabarit noir et blanc aux couleurs du site, compatible avec les clients mail. */
function renderHtml({ title, paragraphs, cta }: Email) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#d4d4d4">${escape(p)}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0 0"><a href="${escape(cta.href)}" style="display:inline-block;background:#fafafa;color:#050505;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escape(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#050505;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 0 20px"><img src="${SITE_URL}/swell-mark.png" alt="" width="28" style="vertical-align:middle"> <span style="color:#fafafa;font-weight:800;letter-spacing:3px;vertical-align:middle;margin-left:8px">SWELL</span></td></tr>
<tr><td style="background:#0e0e0e;border:1px solid #222;border-radius:16px;padding:28px">
<h1 style="margin:0 0 16px;font-size:20px;color:#fafafa">${escape(title)}</h1>${body}${button}
</td></tr>
<tr><td style="padding:20px 0 0;color:#777;font-size:12px">Swell · <a href="${SITE_URL}" style="color:#999">${SITE_URL.replace(/^https?:\/\//, "")}</a></td></tr>
</table></td></tr></table></body></html>`;
}
