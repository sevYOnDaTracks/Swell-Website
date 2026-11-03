"use client";

import { useSyncExternalStore } from "react";

// Panier de la boutique, gardé dans le navigateur (localStorage) : il survit aux
// rechargements, sans compte. Produits numériques : chaque produit au plus une fois.
const KEY = "swell-cart";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]) {
  cache = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Stockage indisponible (navigation privée...) : le panier reste en mémoire.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Garde le panier à jour entre plusieurs onglets.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    ids,
    count: ids.length,
    has: (id: string) => ids.includes(id),
    add: (id: string) => {
      if (!read().includes(id)) write([...read(), id]);
    },
    remove: (id: string) => write(read().filter((v) => v !== id)),
    clear: () => write([]),
  };
}
