// The idle clicker's juice: the sounds (./sound) and confetti at what happens in the game, and the sound and music switches.
// All of it is set off from effects and event handlers, never from a render; the confetti's randomness is drawn there too.
import { useEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { type Game, LOW } from "./game";
import { hush, music, play, type Sfx, unlock } from "./sound";
import { TEXT } from "./text";
import type { Act } from "./ui";

/** whether the player asked for reduced motion (then no confetti) */
export const still = (): boolean => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** what the game looks like for its sounds: the stages, layers and roles reached (big), the cards shown (small), whether the
 * club's energy is low, whether it folded */
export interface Mood {
  big: number;
  small: number;
  low: boolean;
  folded: boolean;
}
/** the sound for a change of mood from `was` to `now`, if any: folding, then a stage or role, then a new card, then low energy */
export function cue(was: Mood, now: Mood): Sfx | null {
  if (now.folded && !was.folded) return "sad";
  if (now.big > was.big) return "fanfare";
  if (now.small > was.small) return "unlock";
  return now.low && !was.low ? "warn" : null;
}

const COLORS = ["#d41367", "#f7a81b", "#00a2e0", "#2bb673", "#8e5bd8", "#ff7600", "#ffffff"];
/** a burst of confetti at x, y (px in the viewport): each bit's flight, colour, spin and delay */
interface Burst {
  id: number;
  x: number;
  y: number;
  bits: { dx: number; dy: number; c: string; r: number; d: number }[];
}
let burstId = 0;
/** n bits of confetti fired at x, y into the bursts shown, gone after their flight (none under reduced motion) */
function fire(set: Dispatch<SetStateAction<Burst[]>>, x: number, y: number, n: number): void {
  if (still()) return;
  const reach = n > 20 ? 170 : 80;
  const bits = Array.from({ length: n }, () => {
    const a = Math.random() * 2 * Math.PI;
    const v = 30 + Math.random() * reach;
    return {
      dx: Math.cos(a) * v,
      dy: Math.sin(a) * v - 30,
      c: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      r: Math.random() * 720 - 360,
      d: Math.random() * 0.12,
    };
  });
  const b = { id: ++burstId, x, y, bits };
  set((bs) => [...bs.slice(-4), b]);
  setTimeout(() => set((bs) => bs.filter((o) => o !== b)), 1400);
}
/** the middle of element e on the screen (where a purchase made from the keyboard bursts) */
const middle = (e: Element | null): { x: number; y: number } | null => {
  const r = e?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
};

/** the game's juice, for game g and its setter: the sounds start at the first gesture (autoplay rules) and stop when the game
 * closes; a stage, layer or role reached (big) and a new card shown (small) play their sound and burst; low energy and folding
 * play theirs. Returns `act`, which plays a purchase's "bling" and bursts where it was tapped, the bursts to draw, and `cheer`. */
export function useFx(
  g: Game,
  setG: Act,
  big: number,
  small: number,
): { act: Act; bursts: Burst[]; cheer: (n: number) => void } {
  const [bursts, setBursts] = useState<Burst[]>([]);
  /** a gesture was made: sound may play */
  const [heard, setHeard] = useState(false);
  const last = useRef(g);
  /** where the last finger or click went down (null after a key: then the focused button is where) */
  const tap = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    last.current = g;
  }, [g]);
  useEffect(() => {
    const down = (ev: PointerEvent) => {
      tap.current = { x: ev.clientX, y: ev.clientY };
      unlock();
      setHeard(true);
    };
    const key = () => {
      tap.current = null;
      unlock();
      setHeard(true);
    };
    // capture: before the wheel's own handler, so its first tap already ticks
    addEventListener("pointerdown", down, true);
    addEventListener("keydown", key, true);
    return () => {
      removeEventListener("pointerdown", down, true);
      removeEventListener("keydown", key, true);
      hush();
    };
  }, []);
  useEffect(() => music(heard && g.music, g.stage), [heard, g.music, g.stage]);
  const low = g.mem > 0 && !g.folded && g.en < LOW;
  const was = useRef<Mood>({ big, small, low, folded: g.folded });
  useEffect(() => {
    const now = { big, small, low, folded: g.folded };
    const k = cue(was.current, now);
    was.current = now;
    if (k && g.sfx) play(k);
    if (k === "fanfare" || k === "unlock")
      fire(setBursts, innerWidth / 2, innerHeight * 0.3, k === "fanfare" ? 48 : 18);
  }, [big, small, low, g.folded, g.sfx]);
  const act: Act = (f) => {
    const x = last.current;
    const y = f(x);
    // a purchase spends time or helpers within the same year (a new year or start over resets what was earned)
    if ((y.h < x.h || y.helpers < x.helpers) && y.all === x.all) {
      if (x.sfx) play("bling");
      const at = tap.current ?? middle(document.activeElement);
      if (at) fire(setBursts, at.x, at.y, 14);
    }
    setG(f);
  };
  /** a burst of n bits over the middle of the screen (from an event handler or an effect) */
  const cheer = (n: number) => fire(setBursts, innerWidth / 2, innerHeight * 0.3, n);
  return { act, bursts, cheer };
}
/** the confetti flying: fixed to the screen, so it never widens the popup */
export function Confetti({ bursts }: { bursts: Burst[] }) {
  return bursts.map((b) => (
    <div key={b.id} className="confetti" aria-hidden="true" style={{ left: b.x, top: b.y }}>
      {b.bits.map((p, i) => (
        <i
          key={i}
          style={
            {
              "--dx": `${p.dx.toFixed(0)}px`,
              "--dy": `${p.dy.toFixed(0)}px`,
              "--r": `${p.r.toFixed(0)}deg`,
              background: p.c,
              animationDelay: `${p.d.toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  ));
}
/** the sound and music switches, in the top bar */
export function Switches({ g, set }: { g: Game; set: Act }) {
  return (
    <div className="snd">
      <button
        type="button"
        aria-pressed={g.sfx}
        aria-label={TEXT.sfx}
        title={TEXT.sfx}
        onClick={() => set((x) => ({ ...x, sfx: !x.sfx }))}
      >
        {g.sfx ? "🔊" : "🔇"}
      </button>
      <button
        type="button"
        aria-pressed={g.music}
        aria-label={TEXT.music}
        title={TEXT.music}
        onClick={() => set((x) => ({ ...x, music: !x.music }))}
      >
        🎵
      </button>
    </div>
  );
}
