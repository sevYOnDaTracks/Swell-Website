import "server-only";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { license, product, setting, shopOrder, shopOrderItem, supportMessage, supportTicket, user, type SupportStatus, type SupportSubject } from "@/db/schema";

// Support : une demande (ticket) et ses messages. Le client suit sa demande dans son espace,
// ou par le lien secret de l'email s'il n'a pas de compte ; l'admin répond depuis /admin/support.

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => LETTERS[b % LETTERS.length]).join("");

export const newTicketReference = () => `SP-${randomCode(6)}`;

export async function createTicket(input: {
  userId: string | null;
  name: string;
  email: string;
  subject: SupportSubject;
  productId: string | null;
  orderId: string | null;
  body: string;
  attachment: string | null;
}) {
  const id = crypto.randomUUID();
  const reference = newTicketReference();
  const token = randomCode(24);
  db.transaction((tx) => {
    tx.insert(supportTicket)
      .values({ id, reference, token, userId: input.userId, name: input.name, email: input.email, subject: input.subject, productId: input.productId, orderId: input.orderId })
      .run();
    tx.insert(supportMessage).values({ ticketId: id, author: "client", body: input.body, attachment: input.attachment }).run();
  });
  return { id, reference, token };
}

/** Ajoute un message ; la demande passe « en attente de Swell » (client) ou « réponse reçue » (admin). */
export async function addSupportMessage(ticketId: string, author: "client" | "admin", body: string, attachment: string | null, close = false) {
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(supportMessage).values({ ticketId, author, body, attachment, createdAt: now }).run();
    tx.update(supportTicket)
      .set({ lastMessageAt: now, status: close ? "closed" : author === "client" ? "open" : "answered" })
      .where(eq(supportTicket.id, ticketId))
      .run();
  });
}

export async function setSupportStatus(ticketId: string, status: SupportStatus) {
  await db.update(supportTicket).set({ status }).where(eq(supportTicket.id, ticketId));
}

/** Une demande et ses messages, si ce visiteur y a droit (son compte, le lien secret, ou l'admin). */
export async function getTicketFor(reference: string, viewer: { userId?: string | null; token?: string | null; admin?: boolean }) {
  const [ticket] = await db.select().from(supportTicket).where(eq(supportTicket.reference, reference.toUpperCase()));
  if (!ticket) return null;
  const allowed = viewer.admin || (!!viewer.userId && ticket.userId === viewer.userId) || (!!viewer.token && viewer.token === ticket.token);
  if (!allowed) return null;
  const [messages, productRow, orderRow] = await Promise.all([
    db.select().from(supportMessage).where(eq(supportMessage.ticketId, ticket.id)).orderBy(asc(supportMessage.createdAt)),
    ticket.productId ? db.select({ name: product.name, slug: product.slug }).from(product).where(eq(product.id, ticket.productId)) : Promise.resolve([]),
    ticket.orderId ? db.select({ reference: shopOrder.reference }).from(shopOrder).where(eq(shopOrder.id, ticket.orderId)) : Promise.resolve([]),
  ]);
  return { ticket, messages, product: productRow[0] ?? null, order: orderRow[0] ?? null };
}

export async function getTicketById(id: string) {
  const [ticket] = await db.select().from(supportTicket).where(eq(supportTicket.id, id));
  return ticket ?? null;
}

/** Demandes d'un client, de la plus récente à la plus ancienne. */
export async function getMyTickets(userId: string) {
  return db.select().from(supportTicket).where(eq(supportTicket.userId, userId)).orderBy(desc(supportTicket.lastMessageAt));
}

/** Liste de l'admin : par onglet (à traiter, en attente du client, résolues, toutes) et recherche. */
export async function getAdminTickets(filters: { status: SupportStatus | "all"; q?: string; limit: number; offset: number }) {
  const q = filters.q?.trim();
  const where = and(
    filters.status === "all" ? undefined : eq(supportTicket.status, filters.status),
    q ? or(like(supportTicket.reference, `%${q}%`), like(supportTicket.name, `%${q}%`), like(supportTicket.email, `%${q}%`)) : undefined,
  );
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        ticket: supportTicket,
        productName: product.name,
        messages: sql<number>`(select count(*) from ${supportMessage} where ${supportMessage.ticketId} = ${supportTicket.id})`,
        preview: sql<string>`(select ${supportMessage.body} from ${supportMessage} where ${supportMessage.ticketId} = ${supportTicket.id} order by ${supportMessage.createdAt} desc limit 1)`,
      })
      .from(supportTicket)
      .leftJoin(product, eq(supportTicket.productId, product.id))
      .where(where)
      // À traiter : la plus ancienne d'abord (elle attend depuis le plus longtemps). Ailleurs : la plus récente.
      .orderBy(filters.status === "open" ? asc(supportTicket.lastMessageAt) : desc(supportTicket.lastMessageAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db.select({ total: sql<number>`count(*)` }).from(supportTicket).where(where),
  ]);
  return { rows, total: Number(total) };
}

export async function getSupportCounts() {
  const rows = await db.select({ status: supportTicket.status, n: sql<number>`count(*)` }).from(supportTicket).groupBy(supportTicket.status);
  const get = (s: SupportStatus) => Number(rows.find((r) => r.status === s)?.n ?? 0);
  return { open: get("open"), answered: get("answered"), closed: get("closed"), all: rows.reduce((t, r) => t + Number(r.n), 0) };
}

/** Contexte du client pour l'admin : ses plugins (licences), ses dernières commandes. */
export async function getSupportContext(userId: string | null, email: string) {
  const [account] = userId
    ? await db.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }).from(user).where(eq(user.id, userId))
    : await db.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }).from(user).where(eq(user.email, email.toLowerCase()));
  if (!account) return null;
  const [licenses, orders] = await Promise.all([
    db
      .select({ key: license.key, productName: license.productName, trialEndsAt: license.trialEndsAt, viaSubscription: license.viaSubscription, revokedAt: license.revokedAt })
      .from(license)
      .where(eq(license.userId, account.id))
      .orderBy(asc(license.productName)),
    db
      .select({ id: shopOrder.id, reference: shopOrder.reference, status: shopOrder.status, total: shopOrder.totalCents, method: shopOrder.method, createdAt: shopOrder.createdAt })
      .from(shopOrder)
      .where(eq(shopOrder.userId, account.id))
      .orderBy(desc(shopOrder.createdAt))
      .limit(5),
  ]);
  const items = orders.length
    ? await db
        .select({ orderId: shopOrderItem.orderId, name: shopOrderItem.name })
        .from(shopOrderItem)
        .where(sql`${shopOrderItem.orderId} in (${sql.join(orders.map((o) => sql`${o.id}`), sql`, `)})`)
    : [];
  return { account, licenses, orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id).map((i) => i.name) })) };
}

// --- Réglages (numéro WhatsApp affiché sur /support) ------------------------

export type SupportSettings = { whatsapp: string };
const KEY = "support";

export async function getSupportSettings(): Promise<SupportSettings> {
  const [row] = await db.select({ value: setting.value }).from(setting).where(eq(setting.key, KEY));
  try {
    return { whatsapp: "", ...(row ? JSON.parse(row.value) : {}) };
  } catch {
    return { whatsapp: "" };
  }
}

export async function saveSupportSettings(value: SupportSettings) {
  const json = JSON.stringify(value);
  await db.insert(setting).values({ key: KEY, value: json }).onConflictDoUpdate({ target: setting.key, set: { value: json } });
}
