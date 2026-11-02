"use client";

import { useState, useTransition } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { updateProfile } from "@/app/actions/profile";
import { Avatar } from "@/components/dashboard/Avatar";
import { COUNTRY_CODES, splitPhone } from "@/lib/phone";

export const input =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-white/50 focus:ring-2 focus:ring-white/10";

export type ProfileValues = {
  name: string;
  email: string;
  image: string | null;
  phone: string | null;
  birthDate: string | null;
};

export function ProfileForm({ profile }: { profile: ProfileValues }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(profile.image);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const phone = splitPhone(profile.phone);
  const today = new Date().toISOString().slice(0, 10);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setMessage(null);
    start(async () => {
      const result = await updateProfile(formData);
      setMessage("error" in result ? { ok: false, text: result.error } : { ok: true, text: "Profil enregistré." });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={profile.name} image={removeAvatar ? null : preview} size={72} />
        <div className="space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/5">
            <Camera size={16} /> {preview && !removeAvatar ? "Changer la photo" : "Ajouter une photo"}
            <input
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPreview(URL.createObjectURL(f));
                  setRemoveAvatar(false);
                }
              }}
            />
          </label>
          {profile.image && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                name="removeAvatar"
                checked={removeAvatar}
                onChange={(e) => setRemoveAvatar(e.target.checked)}
                className="accent-white"
              />
              Supprimer la photo
            </label>
          )}
          <p className="text-xs text-muted">JPG, PNG ou WebP, 5 Mo max.</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Nom *</span>
          <input name="name" required minLength={2} maxLength={80} defaultValue={profile.name} autoComplete="name" className={input} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input value={profile.email} readOnly disabled className={`${input} cursor-not-allowed opacity-60`} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span className="text-sm font-medium">Téléphone</span>
          <div className="mt-1.5 flex gap-2">
            <div className="w-[120px] shrink-0">
              <select name="phoneCode" defaultValue={phone.code} aria-label="Indicatif" className={`${input} mt-0 [color-scheme:dark]`}>
                {COUNTRY_CODES.map((c) => (
                  <option key={`${c.code}-${c.country}`} value={c.code}>
                    {c.flag} {c.code} {c.country}
                  </option>
                ))}
              </select>
            </div>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              defaultValue={phone.number}
              placeholder="6 12 34 56 78"
              className={`${input} mt-0`}
            />
          </div>
          <span className="mt-1 block text-xs text-muted">Pour te joindre le jour de ta session.</span>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Date de naissance</span>
          <input
            name="birthDate"
            type="date"
            min="1900-01-01"
            max={today}
            defaultValue={profile.birthDate ?? ""}
            autoComplete="bday"
            className={`${input} [color-scheme:dark]`}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          Enregistrer
        </button>
        {message && (
          <p role="status" className={`flex items-center gap-1.5 text-sm ${message.ok ? "text-foreground" : "text-red-300"}`}>
            {message.ok && <CheckCircle2 size={16} />}
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
