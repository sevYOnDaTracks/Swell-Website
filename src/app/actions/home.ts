"use server";

import { refresh, updateTag } from "next/cache";
import { saveHomeSettings, HOME_TAG } from "@/lib/home";
import type { HomeSettings } from "@/lib/home-format";
import { requireAdmin } from "@/lib/session";
import { saveUpload, UploadError } from "@/lib/storage";

/** Lien d'un bouton : une page du site (/boutique...) ou une adresse https. */
const validHref = (href: string) => /^\/(?!\/)/.test(href) || /^https:\/\/[^\s]+$/.test(href);

const endOfDay = (value: string | null) => {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

export type HomeInput = {
  campaign: {
    enabled: boolean;
    title: string;
    subtitle: string;
    lead: string;
    price: string;
    priceNote: string;
    offers: string[];
    ctaLabel: string;
    href: string;
    fineprint: string;
    imageFile: string | null;
    endsAt: string;
  };
  bar: { enabled: boolean; text: string; linkLabel: string; href: string; endsAt: string };
  slides: {
    id: string;
    enabled: boolean;
    badge: string;
    title: string;
    text: string;
    ctaLabel: string;
    href: string;
    productId: string | null;
    imageFile: string | null;
    endsAt: string;
  }[];
  newProductIds: string[];
};

/** Enregistre la bannière, les annonces et les nouveautés de l'accueil. */
export async function saveHome(input: HomeInput): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const bar = input.bar;
  if (bar.enabled && !bar.text.trim()) return { error: "La bannière a besoin d'un texte." };
  if (bar.href.trim() && !validHref(bar.href.trim())) return { error: "Lien de la bannière invalide : une page du site (/boutique…) ou une adresse https." };
  const barEnd = endOfDay(bar.endsAt);
  if (barEnd === undefined) return { error: "Date de fin de la bannière invalide." };
  const c = input.campaign;
  if (c.enabled && !c.title.trim()) return { error: "Le bandeau campagne a besoin d'un titre." };
  if (c.href.trim() && !validHref(c.href.trim())) return { error: "Lien du bandeau campagne invalide : une page du site (/boutique…) ou une adresse https." };
  const campaignEnd = endOfDay(c.endsAt);
  if (campaignEnd === undefined) return { error: "Date de fin du bandeau campagne invalide." };
  if (c.imageFile && !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(c.imageFile)) return { error: "Image du bandeau campagne invalide." };
  if (input.slides.length > 8) return { error: "8 annonces au maximum." };

  const slides: HomeSettings["slides"] = [];
  for (const [i, s] of input.slides.entries()) {
    const label = s.title.trim() ? `« ${s.title.trim()} »` : `n° ${i + 1}`;
    if (!s.title.trim()) return { error: `L'annonce ${label} a besoin d'un titre.` };
    if (s.href.trim() && !validHref(s.href.trim())) return { error: `Lien du bouton invalide pour l'annonce ${label}.` };
    const end = endOfDay(s.endsAt);
    if (end === undefined) return { error: `Date de fin invalide pour l'annonce ${label}.` };
    if (s.imageFile && !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(s.imageFile)) return { error: `Image invalide pour l'annonce ${label}.` };
    slides.push({
      id: s.id || crypto.randomUUID(),
      enabled: s.enabled,
      badge: s.badge.trim().slice(0, 30),
      title: s.title.trim().slice(0, 80),
      text: s.text.trim().slice(0, 220),
      ctaLabel: s.ctaLabel.trim().slice(0, 30) || "Découvrir",
      href: s.href.trim() || "/boutique",
      productId: s.productId || null,
      imageFile: s.imageFile || null,
      endsAt: end,
    });
  }

  await saveHomeSettings({
    campaign: {
      enabled: c.enabled,
      title: c.title.trim().slice(0, 40),
      subtitle: c.subtitle.trim().slice(0, 40),
      lead: c.lead.trim().slice(0, 60),
      price: c.price.trim().slice(0, 14),
      priceNote: c.priceNote.trim().slice(0, 20),
      offers: c.offers.map((o) => o.trim().slice(0, 40)).filter(Boolean).slice(0, 3),
      ctaLabel: c.ctaLabel.trim().slice(0, 30) || "Voir la promo",
      href: c.href.trim() || "/boutique",
      fineprint: c.fineprint.trim().slice(0, 240),
      imageFile: c.imageFile || null,
      endsAt: campaignEnd,
    },
    bar: { enabled: bar.enabled, text: bar.text.trim().slice(0, 120), linkLabel: bar.linkLabel.trim().slice(0, 30), href: bar.href.trim(), endsAt: barEnd },
    slides,
    newProductIds: [...new Set(input.newProductIds.filter((id) => typeof id === "string"))].slice(0, 8),
  });
  updateTag(HOME_TAG);
  refresh();
  return { ok: true };
}

/** Image d'une annonce (envoyée seule, avant l'enregistrement). */
export async function uploadHomeImage(formData: FormData): Promise<{ file: string } | { error: string }> {
  await requireAdmin();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis une image." };
  try {
    return { file: await saveUpload(file, "image") };
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
}
