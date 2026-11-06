"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Ban, KeyRound, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
};

const input =
  "mt-1 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none focus:border-white/50 [color-scheme:dark]";
const iconButton = "rounded-md p-2 text-muted transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40";

export function UsersManager({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
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
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, email ou téléphone" className={`${input} mt-0 pl-9`} />
        </label>
        <label>
          <span className="sr-only">Filtrer</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={`${input} mt-0`}>
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
        {shown.map((u) => {
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
                  <button type="button" title="Modifier" aria-label={`Modifier ${u.name}`} onClick={() => setEditing(editing === u.id ? null : u.id)} className={iconButton}>
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
    </div>
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
