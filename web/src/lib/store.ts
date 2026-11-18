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
  /** the link to install in Chrome came back: this phone has no Chrome (lib/install chromeInstead) */
  "rac.noChrome": boolean;
  /** Home's daily "Did you know?" line: off unless switched on in Settings */
  "rac.tips": boolean;
  "rac.onboarded": boolean;
  "rac.guideSeen": boolean;
  /** the subscribe card on Home was opened once, so it stays away */
  "rac.subSeen": boolean;
  /** the idle clicker (components/Clicker): the service time to spend and all earned this Rotary year (seconds), when it was
   * last saved, the levels of Handshake (grip) and Momentum (oil), how the wheel may be spun (0 tap, 1 swipe, 2 hold), the
   * members (0 before the club is founded, a fraction while one is leaving), the club's energy (0 to 1), and whether the club
   * folded. The stage reached (1 wheel, 2 club, 3 family and upgrades, 4 projects, 5 Avenues, 6 exchange, 7 district, 8
   * year). Per project: how many are owned, seconds into its run (-1 idle), whether a committee runs it, whether the player switched
   * that committee off. The Social committee (soc: null not bought, else whether it is on). The real event's run going on (its id, seconds into it) and the ids of those already run. Per Avenue of
   * Service: its points (pts) and the members of its kind (kind, fractional; the rest are plain). Per wheel of the Rotary family:
   * its level (fam); the mentors, members who moved on to Rotary once its wheel was there (alum, fractional); the guest
   * speaker's talk going on (k which, t seconds left). Per club on the exchange: its last prices (px, the last is now), the
   * shares held (sh) and the time paid for them, and the exchange's best net gain at a sale this year less its sales' net gain (peak); the Foundation's deposits (n seconds put in, t seconds until they come
   * back). The clubs chartered (chart, kept across handovers), the District conference going on (t seconds into it, n turns
   * made), the seconds until the next one may start (cool) and of doubled time left (boost). Kept across handovers too: the
   * years handed over, the helpers (people helped in years before, not spent), the levels they bought (perm: Experience,
   * Treasurer, Vice-president, Mentoring), and the General Assembly's votes for the year (ga: culture, meeting rhythm, the
   * president's theme Avenue, the twin club; -1 none). The player's sound (sfx) and music switches, kept across new years. v
   * tells an older save apart, which is dropped. */
  "rac.clicker": {
    v: 10;
    h: number;
    all: number;
    at: number;
    grip: number;
    oil: number;
    spin: number;
    mem: number;
    en: number;
    folded: boolean;
    stage: number;
    own: number[];
    run: number[];
    com: boolean[];
    off: boolean[];
    soc: null | boolean;
    ev: null | { id: string; t: number };
    evs: string[];
    pts: number[];
    kind: number[];
    fam: number[];
    alum: number;
    talk: null | { k: number; t: number };
    px: number[][];
    sh: number[];
    paid: number[];
    peak: number;
    dep: { n: number; t: number }[];
    chart: number;
    conf: null | { t: number; n: number };
    cool: number;
    boost: number;
    years: number;
    helpers: number;
    perm: number[];
    ga: number[];
    sfx: boolean;
    music: boolean;
    /** levels bought at once in the upgrades and projects: 1, 10, or 0 for as many as there is time for */
    bulk: number;
    /** the members of each family wheel, the members moved along each mesh of the pipeline, each wheel's slip's seconds left */
    fm: number[];
    moved: number[];
    slip: number[];
    /** this year's project runs, and the most members the club had */
    runs: number;
    top: number;
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
