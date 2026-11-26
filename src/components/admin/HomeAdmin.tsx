"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, ImagePlus, Loader2, Piano, Plus, Search, Trash2, X } from "lucide-react";
import { saveHome, uploadHomeImage, type HomeInput } from "@/app/actions/home";
import type { HomeSettings } from "@/lib/home-format";
import { mediaUrl } from "@/lib/shop-format";

export type AdminProduct = { id: string; name: string; slug: string; coverFile: string | null; type: string };

const field =
  "mt-1.5 block w-full rounded-lg border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-white/50";
const dateValue = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(iso)) : "");

type Slide = HomeInput["slides"][number];

const blankSlide = (): Slide => ({
  id: "",
  enabled: true,
  badge: "Nouveau",
  title: "",
  text: "",
  ctaLabel: "Découvrir",
  href: "/boutique",
  productId: null,
  imageFile: null,
  endsAt: "",
});

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-white" : "bg-white/15"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${checked ? "left-[22px] bg-black" : "left-0.5 bg-white/70"}`} />
    </button>
  );
}

function Thumb({ file, size = 32 }: { file: string | null; size?: number }) {
  return (
    <span className="relative shrink-0 overflow-hidden rounded-md bg-surface-2" style={{ width: size, height: size }}>
      {file ? <Image src={mediaUrl(file)} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" /> : <Piano size={14} className="absolute inset-0 m-auto text-white/50" />}
    </span>
  );
}

function Section({ title, description, children, action }: { title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Éditeur d'une annonce. */
function SlideEditor({ value, onChange, products }: { value: Slide; onChange: (v: Slide) => void; products: AdminProduct[] }) {
  const set = <K extends keyof Slide>(k: K) => (v: Slide[K]) => onChange({ ...value, [k]: v });
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const product = products.find((p) => p.id === value.productId);

  function upload(file: File) {
    setUploadError(null);
    const data = new FormData();
    data.set("image", file);
    startUpload(async () => {
      const result = await uploadHomeImage(data);
      if ("error" in result) return setUploadError(result.error);
      set("imageFile")(result.file);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 border-t border-white/10 px-5 py-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <label className="block text-sm">
            <span className="font-medium">Pastille</span>
            <input value={value.badge} onChange={(e) => set("badge")(e.target.value)} maxLength={30} placeholder="Nouveau, -30 %…" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Titre</span>
            <input value={value.title} onChange={(e) => set("title")(e.target.value)} maxLength={80} placeholder="Swell Essential Guitar" className={field} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium">Texte</span>
          <textarea value={value.text} onChange={(e) => set("text")(e.target.value)} maxLength={220} rows={3} placeholder="Une ou deux phrases sous le titre." className={`${field} resize-none`} />
          <span className="mt-1 block text-right text-xs text-muted tabular-nums">{value.text.length} / 220</span>
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <label className="block text-sm">
            <span className="font-medium">Texte du bouton</span>
            <input value={value.ctaLabel} onChange={(e) => set("ctaLabel")(e.target.value)} maxLength={30} className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Lien du bouton</span>
            <input value={value.href} onChange={(e) => set("href")(e.target.value)} placeholder="/boutique/swell-lead ou /abonnement" className={field} />
          </label>
        </div>
        <label className="block text-sm sm:max-w-[220px]">
          <span className="font-medium">Fin de l&apos;annonce</span>
          <input type="date" value={value.endsAt} onChange={(e) => set("endsAt")(e.target.value)} className={`${field} [color-scheme:dark]`} />
          <span className="mt-1 block text-xs text-muted">Vide = sans fin. Elle disparaît toute seule à cette date.</span>
        </label>
      </div>

      <div className="space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Produit mis en avant</span>
          <select
            value={value.productId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const p = products.find((x) => x.id === id);
              // Premier choix d'un produit : son nom et sa fiche remplissent le titre et le lien laissés par défaut.
              onChange({ ...value, productId: id, title: value.title || p?.name || "", href: value.href === "/boutique" && p ? `/boutique/${p.slug}` : value.href });
            }}
            className={`${field} [color-scheme:dark]`}
          >
            <option value="">Aucun</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">Son visuel s&apos;affiche à droite du texte, si aucune image n&apos;est envoyée.</span>
        </label>

        <div>
          <p className="text-sm font-medium">Image en grand (facultatif)</p>
          <div className="relative mt-1.5 aspect-[16/7] overflow-hidden rounded-xl border border-dashed border-white/15 bg-background/40">
            {value.imageFile ? (
              <>
                <Image src={mediaUrl(value.imageFile)} alt="" fill sizes="600px" unoptimized className="object-cover" />
                <button
                  type="button"
                  onClick={() => set("imageFile")(null)}
                  aria-label="Retirer l'image"
                  className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
                >
                  <X size={16} />
                </button>
              </>
            ) : product?.coverFile ? (
              <div className="flex h-full items-center justify-center gap-3 text-sm text-muted">
                <Thumb file={product.coverFile} size={64} /> Visuel de {product.name}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">Quatre visuels de plugins</div>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} {value.imageFile ? "Changer l'image" : "Envoyer une image"}
          </button>
          <p className="mt-1 text-xs text-muted">JPG, PNG ou WebP, 5 Mo max. Format large conseillé (1920 × 840). Le texte s&apos;affiche dessus, à gauche.</p>
          {uploadError && <p className="mt-1 text-sm text-red-400">{uploadError}</p>}
        </div>
      </div>
    </div>
  );
}

/** Réglages du grand bandeau campagne. */
function CampaignEditor({
  value: c,
  set,
}: {
  value: HomeInput["campaign"];
  set: <K extends keyof HomeInput["campaign"]>(k: K, v: HomeInput["campaign"][K]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const offers = [0, 1, 2].map((i) => c.offers[i] ?? "");
  const setOffer = (i: number, v: string) => set("offers", offers.map((o, k) => (k === i ? v : o)));

  function upload(file: File) {
    setUploadError(null);
    const data = new FormData();
    data.set("image", file);
    startUpload(async () => {
      const result = await uploadHomeImage(data);
      if ("error" in result) return setUploadError(result.error);
      set("imageFile", result.file);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Grand titre</span>
            <input value={c.title} onChange={(e) => set("title", e.target.value)} maxLength={40} placeholder="Black Friday" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Pastille au-dessus du titre</span>
            <input value={c.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={40} placeholder="C'est parti !" className={field} />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="block text-sm">
            <span className="font-medium">Ligne au-dessus du prix</span>
            <input value={c.lead} onChange={(e) => set("lead", e.target.value)} maxLength={60} placeholder="27 plugins à" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Prix géant</span>
            <input value={c.price} onChange={(e) => set("price", e.target.value)} maxLength={14} placeholder="9,99 €" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Après le prix</span>
            <input value={c.priceNote} onChange={(e) => set("priceNote", e.target.value)} maxLength={20} placeholder="chacun" className={field} />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium">Offres sous le prix (facultatif)</p>
          <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {offers.map((o, i) => (
              <input
                key={i}
                aria-label={`Offre ${i + 1}`}
                value={o}
                onChange={(e) => setOffer(i, e.target.value)}
                maxLength={40}
                placeholder={["3 plugins pour 24 €", "6 plugins pour 45 €", ""][i] || "Offre"}
                className={`${field} mt-0`}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_170px]">
          <label className="block text-sm">
            <span className="font-medium">Texte du bouton</span>
            <input value={c.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} maxLength={30} className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Lien du bouton</span>
            <input value={c.href} onChange={(e) => set("href", e.target.value)} placeholder="/boutique" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Fin</span>
            <input type="date" value={c.endsAt} onChange={(e) => set("endsAt", e.target.value)} className={`${field} [color-scheme:dark]`} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium">Conditions (en petit sous le bouton)</span>
          <input value={c.fineprint} onChange={(e) => set("fineprint", e.target.value)} maxLength={240} placeholder="Offre valable jusqu'au 1er décembre, hors abonnements." className={field} />
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium">Fond</p>
          <div className="relative mt-1.5 aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-black">
            {c.imageFile && <Image src={mediaUrl(c.imageFile)} alt="" fill sizes="400px" unoptimized className="object-cover opacity-40" />}
            <div className="relative flex h-full flex-col items-center justify-center px-3 text-center">
              <p className="font-condensed text-3xl leading-none uppercase">{c.title || "Titre"}</p>
              {c.price && (
                <p className="mt-1 font-condensed text-5xl leading-none">{c.price}</p>
              )}
              <span className="mt-2 rounded bg-primary px-3 py-1 text-[11px] font-medium text-black">
                {c.ctaLabel || "Voir la promo"}
              </span>
            </div>
            {c.imageFile && (
              <button type="button" onClick={() => set("imageFile", null)} aria-label="Retirer l'image de fond" className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black">
                <X size={16} />
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} {c.imageFile ? "Changer l'image" : "Envoyer une image de fond"}
          </button>
          <p className="mt-1 text-xs text-muted">Sans image : une mosaïque des visuels de tes plugins, en noir et blanc et très discrète. Image large conseillée (1920 × 1080).</p>
          {uploadError && <p className="mt-1 text-sm text-red-400">{uploadError}</p>}
        </div>
      </div>
    </div>
  );
}

/** Bannière promo, annonces du premier écran et nouveautés de l'accueil. */
export function HomeAdmin({ settings, products }: { settings: HomeSettings; products: AdminProduct[] }) {
  const initial: HomeInput = {
    campaign: { ...settings.campaign, endsAt: dateValue(settings.campaign.endsAt) },
    bar: { ...settings.bar, endsAt: dateValue(settings.bar.endsAt) },
    slides: settings.slides.map((s) => ({ ...s, endsAt: dateValue(s.endsAt) })),
    newProductIds: settings.newProductIds,
  };
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const setCampaign = <K extends keyof HomeInput["campaign"]>(k: K, v: HomeInput["campaign"][K]) =>
    setDraft((d) => ({ ...d, campaign: { ...d.campaign, [k]: v } }));
  const setBar = <K extends keyof HomeInput["bar"]>(k: K, v: HomeInput["bar"][K]) => setDraft((d) => ({ ...d, bar: { ...d.bar, [k]: v } }));
  const setSlide = (i: number, v: Slide) => setDraft((d) => ({ ...d, slides: d.slides.map((s, k) => (k === i ? v : s)) }));
  const byId = new Map(products.map((p) => [p.id, p]));
  const plugins = products.filter((p) => p.type === "vst");
  const shownProducts = products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= draft.slides.length) return;
    const next = [...draft.slides];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft((d) => ({ ...d, slides: next }));
    setOpenIndex((o) => (o === i ? j : o === j ? i : o));
  }

  function save() {
    setMessage(null);
    startSave(async () => {
      const result = await saveHome(draft);
      if ("error" in result) return setMessage({ ok: false, text: result.error });
      setBaseline(draft);
      setMessage({ ok: true, text: "Enregistré. L'accueil est à jour." });
    });
  }

  return (
    <div className="space-y-5 pb-24">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        L&apos;accueil de la boutique : bannière en haut des pages, annonces en grand en premier écran, puis les nouveautés.
        <Link href="/" target="_blank" className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline">
          Voir l&apos;accueil <ExternalLink size={13} />
        </Link>
      </p>

      <Section
        title="Bandeau campagne"
        description="Le grand bandeau tout en haut de l'accueil, au-dessus des annonces : Black Friday, sortie d'un plugin… Titre, prix géant, offres et un gros bouton."
        action={<Switch checked={draft.campaign.enabled} onChange={(v) => setCampaign("enabled", v)} label="Afficher le bandeau campagne" />}
      >
        <CampaignEditor value={draft.campaign} set={setCampaign} />
      </Section>

      <Section
        title="Bannière promo"
        description="Une ligne tout en haut de l'accueil, de la boutique, des fiches produits et des abonnements."
        action={<Switch checked={draft.bar.enabled} onChange={(v) => setBar("enabled", v)} label="Afficher la bannière" />}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_170px]">
          <label className="block text-sm">
            <span className="font-medium">Texte</span>
            <input value={draft.bar.text} onChange={(e) => setBar("text", e.target.value)} maxLength={120} placeholder="-30 % sur tous les plugins jusqu'à dimanche" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Texte du lien</span>
            <input value={draft.bar.linkLabel} onChange={(e) => setBar("linkLabel", e.target.value)} maxLength={30} placeholder="En profiter" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Lien</span>
            <input value={draft.bar.href} onChange={(e) => setBar("href", e.target.value)} placeholder="/boutique" className={field} />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Fin</span>
            <input type="date" value={draft.bar.endsAt} onChange={(e) => setBar("endsAt", e.target.value)} className={`${field} [color-scheme:dark]`} />
          </label>
        </div>
        {draft.bar.text.trim() && (
          <div className={`mt-4 rounded-lg bg-primary px-4 py-2.5 text-center text-sm text-black ${draft.bar.enabled ? "" : "opacity-40"}`}>
            <span className="font-medium">{draft.bar.text}</span>
            {draft.bar.href && <span className="ml-3 font-semibold">{draft.bar.linkLabel || "En profiter"} →</span>}
          </div>
        )}
      </Section>

      <Section
        title="Annonces du premier écran"
        description="Elles défilent en grand en haut de l'accueil, avec un bouton vers la page de ton choix et un bouton vers la boutique. Sans annonce, l'accueil montre tout seul le dernier plugin sorti, l'abonnement et les promos en cours."
      >
        <div className="space-y-3">
          {draft.slides.map((s, i) => {
            const isOpen = openIndex === i;
            const p = s.productId ? byId.get(s.productId) : undefined;
            return (
              <div key={s.id || `new-${i}`} className={`overflow-hidden rounded-xl border bg-background/40 ${isOpen ? "border-white/30" : "border-white/10"}`}>
                <div className="flex flex-wrap items-center gap-4 px-4 py-3">
                  <button type="button" onClick={() => setOpenIndex(isOpen ? null : i)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    {s.imageFile ? (
                      <span className="relative h-9 w-16 shrink-0 overflow-hidden rounded-md">
                        <Image src={mediaUrl(s.imageFile)} alt="" fill sizes="64px" unoptimized className="object-cover" />
                      </span>
                    ) : (
                      <Thumb file={p?.coverFile ?? null} size={36} />
                    )}
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        {s.badge && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-black">{s.badge}</span>}
                        <span className="truncate font-medium">{s.title || "Nouvelle annonce"}</span>
                        {!s.enabled && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted">Masquée</span>}
                        {s.endsAt && <span className="text-xs text-muted">jusqu&apos;au {new Date(`${s.endsAt}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {s.ctaLabel} → {s.href}
                      </span>
                    </span>
                  </button>
                  <Switch checked={s.enabled} onChange={(v) => setSlide(i, { ...s, enabled: v })} label="Afficher l'annonce" />
                  <span className="flex items-center">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter" className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-30">
                      <ArrowUp size={16} />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === draft.slides.length - 1} aria-label="Descendre" className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground disabled:opacity-30">
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`Supprimer l'annonce « ${s.title || "sans titre"} » ?`)) return;
                        setDraft((d) => ({ ...d, slides: d.slides.filter((_, k) => k !== i) }));
                        setOpenIndex(null);
                      }}
                      aria-label="Supprimer l'annonce"
                      className="rounded-md p-1.5 text-muted hover:bg-white/10 hover:text-foreground"
                    >
                      <Trash2 size={16} />
                    </button>
                  </span>
                </div>
                {isOpen && <SlideEditor value={s} onChange={(v) => setSlide(i, v)} products={products} />}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setDraft((d) => ({ ...d, slides: [...d.slides, blankSlide()] }));
              setOpenIndex(draft.slides.length);
            }}
            disabled={draft.slides.length >= 8}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3.5 text-sm text-muted transition-colors hover:border-white/40 hover:text-foreground disabled:opacity-50"
          >
            <Plus size={16} /> Ajouter une annonce
          </button>
        </div>
      </Section>

      <Section
        title="Nouveautés"
        description={`Les produits affichés sous les annonces, dans l'ordre où tu les coches (4 au maximum). Rien de coché : les ${Math.min(4, plugins.length)} derniers plugins publiés.`}
      >
        {draft.newProductIds.length > 0 && (
          <ol className="mb-4 flex flex-wrap gap-2">
            {draft.newProductIds.map((id, k) => {
              const p = byId.get(id);
              if (!p) return null;
              return (
                <li key={id} className={`flex items-center gap-2 rounded-full border py-1 pr-1.5 pl-1 text-sm ${k < 4 ? "border-white/30" : "border-white/10 opacity-50"}`}>
                  <Thumb file={p.coverFile} size={24} />
                  {p.name.replace(/^Swell\s+/, "")}
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, newProductIds: d.newProductIds.filter((x) => x !== id) }))}
                    aria-label={`Retirer ${p.name}`}
                    className="rounded-full p-0.5 text-muted hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        <label className="relative block max-w-sm">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <span className="sr-only">Chercher un produit</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un produit" className={`${field} mt-0 pl-9`} />
        </label>
        <div className="mt-3 grid grid-cols-1 max-h-[320px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {shownProducts.map((p) => {
            const on = draft.newProductIds.includes(p.id);
            return (
              <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-2 text-sm transition-colors ${on ? "border-white/40 bg-white/[0.07]" : "border-white/5 hover:border-white/20"}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, newProductIds: e.target.checked ? [...d.newProductIds, p.id] : d.newProductIds.filter((x) => x !== p.id) }))
                  }
                  className="h-4 w-4 shrink-0 accent-white"
                />
                <Thumb file={p.coverFile} />
                <span className="truncate">{p.name.replace(/^Swell\s+/, "")}</span>
              </label>
            );
          })}
        </div>
      </Section>

      {(dirty || message) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className={`text-sm ${message && !message.ok ? "text-red-400" : dirty ? "text-foreground" : "text-muted"}`}>
              {message && (!dirty || !message.ok) ? message.text : "Modifications non enregistrées."}
            </p>
            <div className="flex items-center gap-2">
              {dirty && (
                <button type="button" onClick={() => { setDraft(baseline); setMessage(null); }} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground">
                  Annuler
                </button>
              )}
              {dirty ? (
                <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
                  {saving && <Loader2 size={16} className="animate-spin" />} Enregistrer
                </button>
              ) : (
                <button type="button" onClick={() => setMessage(null)} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-foreground">
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
