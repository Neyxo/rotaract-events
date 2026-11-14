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
  /** the idle clicker (components/Clicker): hours, francs and people helped this Rotary year, when it was last saved, how the
   * wheel may be spun (0 tap, 1 swipe, 2 hold), the level of each family wheel, the project slots (null: empty; else the plan
   * (cause, format, audience, size, budget), what it was judged (stars, weakest part, the budget item that wanted more), its
   * level, its officer, t seconds into its run or -1 idle), every plan tried so far with its stars, and the pins kept from the
   * years handed over. The members: how many (mem, a fraction while one is joining), how many of them are tired, trained (pro)
   * or at the RYLA camp (not in mem) and for how many seconds more, and how many moved on to Rotary. The guest speaker's talk
   * in effect (boost, -1 none) and its seconds left. The Foundation: donations on their way back ([francs, seconds left]),
   * all ever given, the Paul Harris pins awarded to each family wheel; the stake on another club's project and the last one's
   * result in francs. What a handover keeps: the levels of the tree, the culture chosen for this year (-1 none), the names of
   * the clubs chartered, the best year's people helped, the years handed over, the banners won. v tells an older save apart, which is dropped. */
  "rac.clicker": {
    v: 5;
    h: number;
    f: number;
    p: number;
    at: number;
    spin: number;
    fam: number[];
    proj: (null | {
      c: number;
      fm: number;
      a: number;
      z: number;
      b: number[];
      st: number;
      weak: number;
      want: number;
      lv: number;
      auto: boolean;
      t: number;
    })[];
    book: string[];
    pins: number;
    mem: number;
    tired: number;
    pro: number;
    camp: number;
    campT: number;
    alum: number;
    boost: number;
    boostT: number;
    grants: number[][];
    given: number;
    phf: number[];
    stake: null | { club: string; k: number; amt: number; win: boolean; t: number };
    res: number;
    tree: number[];
    cult: number;
    clubs: string[];
    best: number;
    yrs: number;
    ban: number[];
  };
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
