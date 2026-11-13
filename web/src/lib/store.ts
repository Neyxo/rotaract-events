// localStorage, JSON-encoded, never throwing (private mode, blocked storage). Keys and formats never change: people's clubs,
// saved events and settings are in them. set() and remove() notify subscribers (useStored() re-renders on them).
import type { Seen, Settings } from "./types";

export interface StoreKeys {
  "rac.settings": Settings;
  "rac.saved": string[];
  "rac.theme": "light" | "dark";
  "rac.lang": string;
  /** Bärndütsch on top of German (i18n/be.ts) */
  "rac.be": boolean;
  "rac.seen": Seen;
  "rac.seenPrev": Record<string, string>;
  "rac.rotary": boolean;
  "rac.onboarded": boolean;
  "rac.guideSeen": boolean;
  /** the subscribe card on Home was opened once, so it stays away */
  "rac.subSeen": boolean;
  /** the idle clicker (components/Clicker): hours in hand, hours ever earned, how many of each helper, when it last counted */
  "rac.clicker": { h: number; all: number; own: number[]; at: number };
  /** developer mode switch; rac.dev* preview flags only count while it is on */
  "rac.dev": boolean;
  "rac.devUnlocked": boolean;
  "rac.devGuest": boolean;
  "rac.devNew": boolean;
  "rac.devStale": boolean;
  /** "2026-12-24" or "" */
  "rac.devDate": string;
  /** the dark mode check: a color-scheme to declare instead of the app's ("" the app's own, "normal" none at all), and whether to
   *  add a prefers-color-scheme rule; read by index.html at load */
  "rac.devScheme": string;
  "rac.devSchemeRule": boolean;
}
export type StoreKey = keyof StoreKeys;

/** the listeners of a value kept outside React: subscribe (what useSyncExternalStore takes) and emit after every change */
export function emitter(): { subscribe(f: () => void): () => void; emit(): void } {
  const listeners = new Set<() => void>();
  return {
    subscribe: (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    emit: () => listeners.forEach((f) => f()),
  };
}

const changes = emitter();
export const store = {
  get<K extends StoreKey, D>(k: K, d: D): StoreKeys[K] | D {
    try {
      return (JSON.parse(localStorage.getItem(k) ?? "null") as StoreKeys[K] | null) ?? d;
    } catch {
      return d;
    }
  },
  set<K extends StoreKey>(k: K, v: StoreKeys[K]): void {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage off */
    }
    changes.emit();
  },
  remove(k: StoreKey): void {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage off */
    }
    changes.emit();
  },
  subscribe: changes.subscribe,
};

/** forgets everything the app keeps on this device: its own keys only, other projects share the origin */
export function resetAll(): void {
  try {
    for (const s of [localStorage, sessionStorage])
      Object.keys(s)
        .filter((k) => k.startsWith("rac."))
        .forEach((k) => s.removeItem(k));
  } catch {
    /* storage off */
  }
}

/** sessionStorage rac.here: the approximate position found after a tap, kept for this tab */
export const here = {
  get(): [number, number] | null {
    try {
      return JSON.parse(sessionStorage.getItem("rac.here") ?? "null") as [number, number] | null;
    } catch {
      return null;
    }
  },
  set(c: [number, number]): void {
    try {
      sessionStorage.setItem("rac.here", JSON.stringify(c));
    } catch {
      /* storage off */
    }
  },
};

/** applies at once (app.css keys on <html data-theme>) and is kept for the next start (index.html's inline script reads rac.theme; without one the app is light, or dark where the browser darkens websites by force) */
export function setTheme(next: "light" | "dark"): void {
  store.set("rac.theme", next);
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = next;
  document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.setAttribute("content", "only " + next);
}
