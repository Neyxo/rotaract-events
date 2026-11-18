// The idle clicker's sounds and music, all synthesized with Web Audio (no audio files). Nothing plays before unlock() is called
// from a gesture (the browsers' autoplay rules), and without an AudioContext (jsdom in the tests, old browsers) every call here
// does nothing.

/** the short sounds: a tick per bit of a wheel turn, a purchase, something new shown, a stage or promotion, low energy, folded,
 * a family wheel skipping teeth */
export type Sfx = "tick" | "bling" | "unlock" | "fanfare" | "warn" | "sad" | "clack";

let ctx: AudioContext | null = null;
/** where the sounds and the music go, each with its own volume */
let sfxOut: GainNode | null = null;
let musicOut: GainNode | null = null;
/** when the last tick played (they are rate-limited) */
let ticked = 0;
/** the music's lookahead scheduler while it plays: its timer, the next eighth note's number and when it starts */
let loop: { id: ReturnType<typeof setInterval>; n: number; at: number } | null = null;

/** the frequency of MIDI note m */
export const hz = (m: number): number => 440 * 2 ** ((m - 69) / 12);
/** the loop's four chords, a bar each (C, G, Am, F), as notes from middle C */
const CHORDS = [
  [0, 4, 7],
  [7, 11, 14],
  [9, 12, 16],
  [5, 9, 12],
];
/** the arpeggio over a chord: up and down its three notes and the root an octave up, in eighth notes */
const ARP = [0, 1, 2, 3, 2, 1, 0, 1];
export const BPM = 116;
/** the notes at eighth note n of the loop: the arpeggio's, and the bass's on every beat (null between) */
export function notesAt(n: number): { arp: number; bass: number | null } {
  const chord = CHORDS[Math.floor(n / 8) % CHORDS.length]!;
  const k = ARP[n % ARP.length]!;
  const arp = hz(72 + chord[k % 3]! + 12 * Math.floor(k / 3));
  return { arp, bass: n % 2 ? null : hz(48 + chord[0]! - (n % 8 === 4 ? 12 : 0)) };
}
/** the music's volume at a stage: quiet, a little louder as the game grows */
export const musicVol = (stage: number): number => 0.035 + 0.004 * Math.min(stage, 8);
/** a tick's pitch at the wheel's speed (turns a second): higher the faster it turns */
export const tickHz = (w: number): number => 420 + 160 * Math.min(Math.abs(w), 8);

/** the audio, made (or woken) at a gesture; does nothing where there is no Web Audio */
export function unlock(): void {
  const AC = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    if (!ctx) {
      ctx = new AC();
      sfxOut = ctx.createGain();
      sfxOut.gain.value = 0.5;
      sfxOut.connect(ctx.destination);
      musicOut = ctx.createGain();
      musicOut.gain.value = 0;
      musicOut.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}
/** one note: frequency f (sliding to `to`, if given) from time t for dur seconds, of wave `type`, at volume vol, into out */
function tone(out: AudioNode, f: number, t: number, dur: number, type: OscillatorType, vol: number, to?: number): void {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const env = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(env).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}
/** the notes of each sound, from time t (w: the wheel's speed, for the tick) */
const SOUNDS: Record<Sfx, (out: AudioNode, t: number, w: number) => void> = {
  tick: (out, t, w) => tone(out, tickHz(w), t, 0.035, "triangle", 0.12),
  bling: (out, t) => {
    tone(out, hz(88), t, 0.08, "square", 0.08);
    tone(out, hz(95), t + 0.07, 0.25, "square", 0.08);
  },
  unlock: (out, t) => [76, 79, 84].forEach((m, i) => tone(out, hz(m), t + i * 0.07, 0.18, "triangle", 0.2)),
  fanfare: (out, t) => {
    [72, 76, 79].forEach((m, i) => tone(out, hz(m), t + i * 0.11, 0.12, "square", 0.08));
    tone(out, hz(84), t + 0.33, 0.55, "square", 0.09);
    tone(out, hz(60), t + 0.33, 0.55, "triangle", 0.2);
  },
  warn: (out, t) => {
    tone(out, 880, t, 0.09, "square", 0.06);
    tone(out, 660, t + 0.14, 0.12, "square", 0.06);
  },
  clack: (out, t) => {
    tone(out, 1400, t, 0.03, "square", 0.07, 500);
    tone(out, 160, t + 0.02, 0.09, "square", 0.12, 70);
  },
  sad: (out, t) => {
    tone(out, hz(67), t, 0.35, "triangle", 0.25, hz(66));
    tone(out, hz(66), t + 0.4, 0.35, "triangle", 0.25, hz(65));
    tone(out, hz(65), t + 0.8, 1.1, "triangle", 0.25, hz(55));
  },
};
/** plays sound k (w: the wheel's speed, for a tick; ticks come at most every 70 ms) */
export function play(k: Sfx, w = 0): void {
  if (!ctx || !sfxOut || ctx.state !== "running") return;
  const t = ctx.currentTime;
  if (k === "tick") {
    if (t - ticked < 0.07) return;
    ticked = t;
  }
  SOUNDS[k](sfxOut, t, w);
}
/** schedules the music's notes for the next 0.25 s (run every 60 ms); a hidden tab skips ahead instead of catching up */
function schedule(): void {
  if (!ctx || !musicOut || !loop) return;
  const eighth = 60 / BPM / 2;
  if (loop.at < ctx.currentTime || document.hidden) loop.at = ctx.currentTime + 0.05;
  if (document.hidden) return;
  while (loop.at < ctx.currentTime + 0.25) {
    const { arp, bass } = notesAt(loop.n);
    tone(musicOut, arp, loop.at, eighth * 0.7, "square", 0.25);
    if (bass) tone(musicOut, bass, loop.at, eighth * 1.8, "triangle", 0.6);
    loop.at += eighth;
    loop.n++;
  }
}
/** the background music on or off, at the volume of the stage reached */
export function music(on: boolean, stage: number): void {
  if (!ctx || !musicOut) return;
  musicOut.gain.setTargetAtTime(on ? musicVol(stage) : 0, ctx.currentTime, 0.3);
  if (on && !loop) loop = { id: setInterval(schedule, 60), n: 0, at: ctx.currentTime + 0.1 };
  if (!on && loop) {
    clearInterval(loop.id);
    loop = null;
  }
}
/** everything stopped and let go (the game closed); the next gesture makes it again */
export function hush(): void {
  if (loop) clearInterval(loop.id);
  loop = null;
  ctx?.close().catch(() => {});
  ctx = null;
  // the next context's clock starts at 0 again
  ticked = 0;
  sfxOut = null;
  musicOut = null;
}
