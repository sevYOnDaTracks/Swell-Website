"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Ban, ChevronLeft, ChevronRight, Gift, KeyRound, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { giftProducts } from "@/app/actions/orders";
import { createUserByAdmin, deleteUserByAdmin, sendPasswordLinkToUser, setUserDisabled, updateUserByAdmin } from "@/app/actions/users";
import { Avatar } from "@/components/dashboard/Avatar";
import { DEFAULT_COUNTRY_CODE, formatPhone, phoneHref, splitPhone } from "@/lib/phone";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  banned: boolean;
  emailVerified: boolean;
  createdLabel: string;
  orders: number;
  bookings: number;
  ownedProductIds: string[];
};

export type GiftableProduct = { id: string; name: string; type: string; published: boolean };

const TYPE_LABELS: Record<string, string> = { vst: "VST", drumkit: "Drum kit", samplepack: "Sample pack", preset: "Presets", instrumental: "Instru" };

const input =
  "mt-1 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none focus:border-white/50 [color-scheme:dark]";
const iconButton = "rounded-md p-2 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40";
const pageButton = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 transition-colors hover:bg-white/5 disabled:opacity-30";
const USERS_PER_PAGE = 20;

export function UsersManager({ users, currentUserId, products }: { users: AdminUser[]; currentUserId: string; products: GiftableProduct[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [gifting, setGifting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();

  const q = query.trim().toLowerCase();
  const shown = users.filter((u) => {
    if (q && !`${u.name} ${u.email} ${u.phone ?? ""}`.toLowerCase().includes(q)) return false;
    if (filter === "admin") return u.role === "admin";
    if (filter === "disabled") return u.banned;
    if (filter === "unverified") return !u.emailVerified;
    return true;
  });
  // 20 comptes par page ; la recherche et le filtre ramènent à la première page.
  const pages = Math.max(1, Math.ceil(shown.length / USERS_PER_PAGE));
  const current = Math.min(page, pages);
  const visible = shown.slice((current - 1) * USERS_PER_PAGE, current * USERS_PER_PAGE);

  function run(action: () => Promise<{ error: string } | { ok: true }>, success: string, after?: () => void) {
    setMessage(null);
    start(async () => {
      const result = await action();
      if ("error" in result) return setMessage({ error: result.error });
      setMessage({ ok: success });
      after?.();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher un utilisateur</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Nom, email ou téléphone"
            className={`${input} mt-0 pl-9`}
          />
        </label>
        <label>
          <span className="sr-only">Filtrer</span>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className={`${input} mt-0`}
          >
            <option value="all">Tous ({users.length})</option>
            <option value="admin">Admins</option>
            <option value="disabled">Désactivés</option>
            <option value="unverified">Email non confirmé</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-black hover:bg-neutral-200"
        >
          {adding ? <X size={16} /> : <Plus size={16} />} {adding ? "Fermer" : "Ajouter"}
        </button>
      </div>

      {message?.error && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {message.error}
        </p>
      )}
      {message?.ok && <p className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm">{message.ok}</p>}

      {adding && (
        <form
          className="grid gap-3 rounded-2xl border border-white/10 bg-surface p-5 sm:grid-cols-2 sm:items-end lg:grid-cols-[1fr_1fr_1fr_130px_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            run(
              () => createUserByAdmin({
                  name: String(data.get("name")),
                  email: String(data.get("email")),
                  role: String(data.get("role")),
                  phoneCode: String(data.get("phoneCode")),
                  phone: String(data.get("phone")),
                }),
              "Compte créé. Un lien pour choisir son mot de passe lui a été envoyé par email.",
              () => {
                form.reset();
                setAdding(false);
              },
            );
          }}
        >
          <label className="text-sm">
            Nom
            <input name="name" required className={input} />
          </label>
          <label className="text-sm">
            Email
            <input name="email" type="email" required className={input} />
          </label>
          <PhoneFields />
          <label className="text-sm">
            Rôle
            <select name="role" className={input}>
              <option value="user">Client</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
            Créer
          </button>
        </form>
      )}

      <ul className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-surface">
        {shown.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">Aucun utilisateur trouvé.</li>}
        {visible.map((u) => {
          const self = u.id === currentUserId;
          return (
            <li key={u.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={u.name} image={u.image} size={36} />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    {u.name}
                    {self && <span className="text-xs font-normal text-muted">(toi)</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-normal ${u.role === "admin" ? "bg-white text-black" : "bg-white/5 text-neutral-300"}`}>
                      {u.role === "admin" ? "Admin" : "Client"}
                    </span>
                    {u.banned && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-normal text-red-300">Désactivé</span>}
                    {!u.emailVerified && <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs font-normal text-muted">Email non confirmé</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                  {u.phone && (
                    <a href={phoneHref(u.phone)} className="block text-sm whitespace-nowrap text-muted hover:text-foreground hover:underline">
                      {formatPhone(u.phone)}
                    </a>
                  )}
                  <p className="text-xs text-muted">
                    Inscrit le {u.createdLabel} · {u.orders} commande{u.orders > 1 ? "s" : ""} · {u.bookings} réservation{u.bookings > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    title="Offrir un produit"
                    aria-label={`Offrir un produit à ${u.name}`}
                    onClick={() => {
                      setEditing(null);
                      setGifting(gifting === u.id ? null : u.id);
                    }}
                    className={iconButton}
                  >
                    <Gift size={16} />
                  </button>
                  <button type="button" title="Modifier" aria-label={`Modifier ${u.name}`} onClick={() => {
                      setGifting(null);
                      setEditing(editing === u.id ? null : u.id);
                    }} className={iconButton}>
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    title="Envoyer un lien de mot de passe"
                    aria-label={`Envoyer un lien de mot de passe à ${u.name}`}
                    disabled={pending}
                    onClick={() => run(() => sendPasswordLinkToUser(u.id), `Lien envoyé à ${u.email}.`)}
                    className={iconButton}
                  >
                    <KeyRound size={16} />
                  </button>
                  <button
                    type="button"
                    title={u.banned ? "Réactiver" : "Désactiver"}
                    aria-label={`${u.banned ? "Réactiver" : "Désactiver"} ${u.name}`}
                    disabled={pending || self}
                    onClick={() => {
                      if (u.banned || confirm(`Désactiver ${u.name} ? Le compte sera déconnecté et ne pourra plus se connecter.`)) {
                        run(() => setUserDisabled(u.id, !u.banned), u.banned ? "Compte réactivé." : "Compte désactivé.");
                      }
                    }}
                    className={iconButton}
                  >
                    {u.banned ? <BadgeCheck size={16} /> : <Ban size={16} />}
                  </button>
                  <button
                    type="button"
                    title="Supprimer"
                    aria-label={`Supprimer ${u.name}`}
                    disabled={pending || self}
                    onClick={() => {
                      if (confirm(`Supprimer définitivement ${u.name} ? Ses ${u.orders} commandes, ses achats et ses ${u.bookings} réservations seront effacés. Désactiver le compte permet de les garder.`)) {
                        run(() => deleteUserByAdmin(u.id), "Compte supprimé.");
                      }
                    }}
                    className={`${iconButton} hover:text-red-300`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {gifting === u.id && (
                <GiftForm
                  user={u}
                  self={self}
                  products={products}
                  pending={pending}
                  onCancel={() => setGifting(null)}
                  onSubmit={(ids, note) =>
                    run(
                      async () => {
                        const result = await giftProducts(u.id, ids, note);
                        return "error" in result ? result : { ok: true as const };
                      },
                      self ? "C'est dans ton espace, avec les clés de licence des VST." : `Cadeau envoyé à ${u.name} : c'est dans son espace, et un email lui a été envoyé.`,
                      () => setGifting(null),
                    )
                  }
                />
              )}

              {editing === u.id && (
                <form
                  className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-background/40 p-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    run(
                      () =>
                        updateUserByAdmin(u.id, {
                          name: String(data.get("name")),
                          email: String(data.get("email")),
                          role: String(data.get("role")),
                          emailVerified: data.get("emailVerified") === "on",
                          phoneCode: String(data.get("phoneCode")),
                          phone: String(data.get("phone")),
                        }),
                      "Compte modifié.",
                      () => setEditing(null),
                    );
                  }}
                >
                  <label className="text-sm">
                    Nom
                    <input name="name" required defaultValue={u.name} className={input} />
                  </label>
                  <label className="text-sm">
                    Email
                    <input name="email" type="email" required defaultValue={u.email} className={input} />
                  </label>
                  <PhoneFields phone={u.phone} />
                  <label className="text-sm">
                    Rôle
                    <select name="role" defaultValue={u.role === "admin" ? "admin" : "user"} disabled={self} className={input}>
                      <option value="user">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                    {self && <input type="hidden" name="role" value="admin" />}
                  </label>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input type="checkbox" name="emailVerified" defaultChecked={u.emailVerified} className="h-4 w-4 accent-white" />
                    Email confirmé
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
                      Enregistrer
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {shown.length > 0 && (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted">
            {(current - 1) * USERS_PER_PAGE + 1}–{Math.min(shown.length, current * USERS_PER_PAGE)} sur {shown.length}
          </p>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(current - 1)} disabled={current === 1} aria-label="Page précédente" className={pageButton}>
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-muted">
                Page {current} / {pages}
              </span>
              <button type="button" onClick={() => setPage(current + 1)} disabled={current === pages} aria-label="Page suivante" className={pageButton}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}

/** Choix des produits à offrir : ceux déjà possédés sont cochés et grisés. */
function GiftForm({
  user,
  self,
  products,
  pending,
  onSubmit,
  onCancel,
}: {
  user: AdminUser;
  self: boolean;
  products: GiftableProduct[];
  pending: boolean;
  onSubmit: (productIds: string[], note: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const owned = new Set(user.ownedProductIds);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <form
      className="mt-4 space-y-3 rounded-xl border border-white/10 bg-background/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected.length > 0) onSubmit(selected, note);
      }}
    >
      <p className="text-sm font-medium">{self ? "T'offrir des produits" : `Offrir à ${user.name}`}</p>
      {products.length === 0 ? (
        <p className="text-sm text-muted">Aucun produit dans la boutique.</p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {products.map((p) => {
            const has = owned.has(p.id);
            return (
              <li key={p.id}>
                <label className={`flex items-center gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm ${has ? "opacity-50" : "cursor-pointer hover:bg-white/[0.04]"}`}>
                  <input
                    type="checkbox"
                    checked={has || selected.includes(p.id)}
                    disabled={has}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 accent-white"
                  />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {has ? "Déjà possédé" : `${TYPE_LABELS[p.type] ?? p.type}${p.published ? "" : " · non publié"}`}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {!self && (
        <label className="block text-sm">
          Petit mot (facultatif, repris dans l&apos;email)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Merci pour le feat !" className={input} />
        </label>
      )}
      <div className="flex gap-2">
        <button
          disabled={pending || selected.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
        >
          <Gift size={15} /> {selected.length > 1 ? `Offrir ces ${selected.length} produits` : "Offrir"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
          Annuler
        </button>
      </div>
    </form>
  );
}

/** Indicatif et numéro, enregistrés comme dans le profil client. */
function PhoneFields({ phone }: { phone?: string | null }) {
  const parts = splitPhone(phone);
  return (
    <div className="text-sm">
      Téléphone
      <div className="mt-1 flex gap-2">
        <input name="phoneCode" aria-label="Indicatif" defaultValue={parts.code || DEFAULT_COUNTRY_CODE} className={`${input} mt-0 w-20 shrink-0`} />
        <input name="phone" aria-label="Numéro de téléphone" type="tel" inputMode="tel" defaultValue={parts.number} placeholder="Facultatif" className={`${input} mt-0 min-w-0`} />
      </div>
    </div>
  );
}
