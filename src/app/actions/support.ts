"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { product, shopOrder, supportSubjects, supportStatuses, type SupportStatus, type SupportSubject } from "@/db/schema";
import { saveProof, PROOF_TYPES } from "@/lib/proofs";
import { isRateLimited } from "@/lib/rate-limit";
import { getCurrentUser, requireAdmin } from "@/lib/session";
import {
  addSupportMessage,
  createTicket,
  getTicketById,
  getTicketFor,
  saveSupportSettings,
  setSupportStatus,
} from "@/lib/support";
import { sendAdminReply, sendClientReply, sendTicketCreated } from "@/lib/support-emails";

const MAX_BODY = 5000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Capture jointe (facultative) : image ou PDF, 8 Mo max, rangée avec les fichiers privés. */
async function readAttachment(form: FormData): Promise<{ file: string | null } | { error: string }> {
  const file = form.get("attachment");
  if (!(file instanceof File) || file.size === 0) return { file: null };
  const ext = PROOF_TYPES[file.type];
  if (!ext) return { error: "La pièce jointe doit être une image (JPG, PNG, WebP) ou un PDF." };
  if (file.size > 8 * 1024 * 1024) return { error: "Pièce jointe trop lourde (8 Mo max)." };
  return { file: await saveProof(file.stream(), ext) };
}

async function limited(scope: string, limit: number) {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "inconnue";
  return isRateLimited(`${scope}:${ip}`, limit, 60 * 60 * 1000);
}

/** Nouvelle demande depuis /support (avec ou sans compte). */
export async function submitSupportTicket(form: FormData): Promise<{ ok: true; reference: string; token: string } | { error: string }> {
  if (await limited("support", 6)) return { error: "Tu as envoyé beaucoup de demandes : réessaie dans une heure, ou réponds à une demande existante." };
  const user = await getCurrentUser();
  const subject = text(form, "subject") as SupportSubject;
  const body = text(form, "body");
  const name = user?.name ?? text(form, "name");
  const email = (user?.email ?? text(form, "email")).toLowerCase();
  // Piège à robots : un champ caché que les humains laissent vide.
  if (text(form, "website")) return { ok: true, reference: "SP-OK", token: "" };
  if (!supportSubjects.includes(subject)) return { error: "Choisis un sujet." };
  if (!name) return { error: "Indique ton nom." };
  if (!EMAIL.test(email)) return { error: "Indique une adresse email valide pour recevoir la réponse." };
  if (body.length < 10) return { error: "Décris ta demande en quelques mots (10 caractères minimum)." };
  if (body.length > MAX_BODY) return { error: "Message trop long (5 000 caractères max)." };
  // Plugin et commande : seulement s'ils existent (et la commande doit être à ce client).
  const productId = text(form, "productId");
  const orderId = user ? text(form, "orderId") : "";
  const [knownProduct] = productId ? await db.select({ id: product.id }).from(product).where(eq(product.id, productId)) : [];
  const [knownOrder] = orderId && user ? await db.select({ id: shopOrder.id }).from(shopOrder).where(and(eq(shopOrder.id, orderId), eq(shopOrder.userId, user.id))) : [];
  const attachment = await readAttachment(form);
  if ("error" in attachment) return attachment;

  const ticket = await createTicket({
    userId: user?.id ?? null,
    name: name.slice(0, 80),
    email,
    subject,
    productId: knownProduct?.id ?? null,
    orderId: knownOrder?.id ?? null,
    body,
    attachment: attachment.file,
  });
  after(() => sendTicketCreated({ ...ticket, name, email, subject }, body));
  return { ok: true, ...ticket };
}

/** Le client répond (connecté, ou avec le lien secret de l'email). */
export async function replyToSupportTicket(form: FormData): Promise<{ ok: true } | { error: string }> {
  if (await limited("support-reply", 30)) return { error: "Trop de messages d'un coup : réessaie un peu plus tard." };
  const user = await getCurrentUser();
  const found = await getTicketFor(text(form, "reference"), { userId: user?.id, token: text(form, "token") || null });
  if (!found) return { error: "Cette demande est introuvable." };
  const body = text(form, "body");
  if (body.length < 2) return { error: "Écris ton message." };
  if (body.length > MAX_BODY) return { error: "Message trop long (5 000 caractères max)." };
  const attachment = await readAttachment(form);
  if ("error" in attachment) return attachment;
  await addSupportMessage(found.ticket.id, "client", body, attachment.file);
  after(() => sendClientReply(found.ticket, body));
  refresh();
  return { ok: true };
}

/** Swell répond depuis l'admin ; « Répondre et résoudre » ferme la demande en même temps. */
export async function replyAsAdmin(form: FormData): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const ticket = await getTicketById(text(form, "ticketId"));
  if (!ticket) return { error: "Cette demande n'existe plus." };
  const body = text(form, "body");
  if (body.length < 2) return { error: "Écris ta réponse." };
  if (body.length > MAX_BODY) return { error: "Réponse trop longue (5 000 caractères max)." };
  const attachment = await readAttachment(form);
  if ("error" in attachment) return attachment;
  const close = text(form, "close") === "1";
  await addSupportMessage(ticket.id, "admin", body, attachment.file, close);
  after(() => sendAdminReply(ticket, body, close));
  refresh();
  return { ok: true };
}

export async function updateSupportStatus(ticketId: string, status: SupportStatus) {
  await requireAdmin();
  if (!supportStatuses.includes(status)) return;
  await setSupportStatus(ticketId, status);
  refresh();
}

export async function updateSupportSettings(whatsapp: string): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const digits = whatsapp.replace(/[^\d+]/g, "");
  if (digits && !/^\+?\d{8,15}$/.test(digits)) return { error: "Numéro WhatsApp invalide (format international, ex. +2250700000000)." };
  await saveSupportSettings({ whatsapp: digits });
  refresh();
  return { ok: true };
}
