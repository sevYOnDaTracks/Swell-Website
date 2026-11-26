"use client";

// Mesure d'audience maison : rien n'est envoyé si le visiteur l'a refusée (page Confidentialité),
// ou si son navigateur demande de ne pas être suivi (Global Privacy Control / Do Not Track).
const OPT_OUT = "swell-no-stats";

export function statsAllowed() {
  try {
    if (localStorage.getItem(OPT_OUT) === "1") return false;
  } catch {}
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !nav.globalPrivacyControl && nav.doNotTrack !== "1";
}

export function setStatsAllowed(allowed: boolean) {
  try {
    if (allowed) localStorage.removeItem(OPT_OUT);
    else localStorage.setItem(OPT_OUT, "1");
  } catch {}
}

let landed = false;

/** Envoie un événement (page vue ou ajout au panier). La première page vue de l'onglet porte la provenance. */
export function track(kind: "view" | "cart", path = location.pathname) {
  if (typeof navigator === "undefined" || !statsAllowed()) return;
  const payload: Record<string, unknown> = { k: kind, p: path };
  if (kind === "view" && !landed) {
    landed = true;
    const q = new URLSearchParams(location.search);
    Object.assign(payload, { l: true, r: document.referrer, us: q.get("utm_source") ?? "", uc: q.get("utm_campaign") ?? "" });
  }
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.("/api/a", new Blob([body], { type: "text/plain" }))) return;
  fetch("/api/a", { method: "POST", body, keepalive: true }).catch(() => {});
}
