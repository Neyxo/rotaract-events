// The drawing kit of the story pictures: colours, shapes, text that wraps and shrinks to its box, and the stack of the four facts
// (title, date, time, place) every design is built around. All in the picture's own 1080x1920 units; a thumbnail scales the context.
import { BRAND, onColor } from "../color";
import type { Club, Event } from "../types";
import type { Facts, Media } from "./facts";

export type G = CanvasRenderingContext2D;
export type Img = HTMLImageElement | HTMLCanvasElement;
/** everything a design draws from: loaded once per event (story.ts), so drawing itself never waits */
export interface Ctx {
  e: Event;
  club: Club;
  /** the club colour and the text colour that reads on it */
  c: string;
  on: string;
  f: Facts;
  media: Media;
  crest: Img | null;
  /** the event's picture (media.kind "pic") */
  pic: Img | null;
  /** the Rotaract lockup and its wheel alone; the Rotary wheel and wordmark */
  mark: Img | null;
  wheel: Img | null;
  rotaryWheel: Img | null;
  rotaryWord: Img | null;
}

export const W = 1080;
export const H = 1920;
/** side margin */
export const M = 80;
export const INK = "#1f1c26";
export const MUTED = "#5f5a6a";
export const PAPER = "#f6f4f0";
export const WHITE = "#ffffff";
export const CRAN = BRAND.cranberry;
/** the red of the lockup itself */
export const LOGO = "#c10042";
export const PLUM = "#4a0d33";
export const WINE = "#8a0c47";
export const HOT = "#ec2d7a";
export const ROYAL = "#17458f";
export const GOLD = "#f7a81b";

// ---- colour ----
export function rgb(hex: string): [number, number, number] {
  const h = hex.slice(1);
  const n = parseInt(h.length < 6 ? h.replace(/./g, "$&$&") : h, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number): string {
  const to = rgb(b);
  return (
    "#" +
    rgb(a)
      .map((v, i) =>
        Math.round(v + ((to[i] ?? 0) - v) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export const lighten = (c: string, t: number) => mix(c, "#ffffff", t);
export const darken = (c: string, t: number) => mix(c, "#000000", t);
export const alpha = (c: string, a: number) => `rgba(${rgb(c)},${a})`;
export function lum(c: string): number {
  const [r, g, b] = rgb(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
/** the club colour as text on white: a light colour is pulled towards ink */
export const strong = (c: string) => (lum(c) > 0.45 ? mix(c, INK, 0.5) : c);
export { onColor };

// ---- shapes ----
export function rr(g: G, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}
export function disc(g: G, x: number, y: number, r: number, color: string): void {
  g.beginPath();
  g.arc(x, y, r, 0, 2 * Math.PI);
  g.fillStyle = color;
  g.fill();
}
/** the whole picture in one colour or gradient */
export function fill(g: G, color: string | CanvasGradient): void {
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
}
/** a soft light of a colour around (x, y) */
export function glow(g: G, x: number, y: number, r: number, color: string, a = 1): void {
  const q = g.createRadialGradient(x, y, 0, x, y, r);
  q.addColorStop(0, alpha(color, a));
  q.addColorStop(1, alpha(color, 0));
  fill(g, q);
}
/** a linear gradient over the whole picture, its colours evenly spread */
export function grad(g: G, cols: string[], x0 = 0, y0 = 0, x1 = 0, y1 = H): void {
  const q = g.createLinearGradient(x0, y0, x1, y1);
  cols.forEach((c, i) => q.addColorStop(i / (cols.length - 1), c));
  fill(g, q);
}
/** a map pin with its tip at (x, y): a hole for an eye, or (ring) a white rim and eye with a shadow, as on the map */
export function pin(g: G, x: number, y: number, s: number, color: string, ring = false): void {
  const cy = y - s * 1.45;
  const r = s * 0.74;
  g.save();
  g.beginPath();
  g.arc(x, cy, r, (Math.PI * 5) / 6, Math.PI / 6);
  g.lineTo(x, y);
  g.closePath();
  if (!ring) {
    g.moveTo(x + r * 0.4, cy);
    g.arc(x, cy, r * 0.4, 0, 2 * Math.PI);
  } else {
    g.shadowColor = "rgba(0,0,0,.4)";
    g.shadowBlur = 24;
    g.shadowOffsetY = 8;
  }
  g.fillStyle = color;
  g.fill("evenodd");
  g.shadowColor = "transparent";
  if (ring) {
    g.lineWidth = 7;
    g.lineJoin = "round";
    g.strokeStyle = WHITE;
    g.stroke();
    disc(g, x, cy, r * 0.4, WHITE);
  }
  g.restore();
}

// ---- text ----
let family = "";
/** the app's own typeface */
export function font(g: G, px: number, weight: number): void {
  family ||= getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  g.font = `${weight} ${px}px ${family}`;
}
/** letter spacing where the browser has it; elsewhere the text is just unspaced */
export function spacing(g: G, px: number): void {
  if ("letterSpacing" in g) g.letterSpacing = px + "px";
}
/** Greedy word wrap into at most `max` lines; what does not fit is cut with an ellipsis. A dash between words stays with the word
 *  after it, so it never stands alone at the end of a line. */
export function wrap(text: string, fits: (s: string) => boolean, max: number): string[] {
  const lines: string[] = [];
  const words = text
    .replace(/\s([-–—])\s+(?=\S)/g, " $1 ")
    .split(/[ \t\n]+/)
    .filter(Boolean);
  for (const word of words) {
    const last = lines.at(-1);
    if (last !== undefined && fits(`${last} ${word}`)) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.length <= max ? lines : [...lines.slice(0, max - 1), `${lines[max - 1]}…`];
}
export interface TextOpts {
  px?: number;
  weight?: number;
  /** the width it wraps or squeezes into */
  w?: number;
  /** lines at most */
  max?: number;
  lh?: number;
  color?: string;
  align?: CanvasTextAlign;
  upper?: boolean;
  /** letter spacing */
  ls?: number;
  a?: number;
}
/** wrapped text with its top at y; x is the left edge, the centre or the right edge (o.align). Returns the y below it. */
export function text(g: G, s: string, x: number, y: number, o: TextOpts = {}): number {
  const { px = 44, weight = 500, w = 920, max = 1, lh = 1.18, color, align = "left", upper, ls = 0, a = 1 } = o;
  g.save();
  font(g, px, weight);
  spacing(g, ls);
  g.textAlign = align;
  g.textBaseline = "alphabetic";
  g.globalAlpha *= a;
  if (color) g.fillStyle = color;
  const lines = wrap(upper ? s.toUpperCase() : s, (t) => g.measureText(t).width <= w, max);
  lines.forEach((l, i) => g.fillText(l, x, y + i * px * lh + px * 0.82, w));
  g.restore();
  return y + lines.length * px * lh;
}
export interface FitOpts {
  w?: number;
  /** the height there is */
  h?: number;
  /** the size it starts from and the smallest it may get */
  px?: number;
  min?: number;
  weight?: number;
  lh?: number;
}
/** the biggest size from o.px down to o.min at which s wraps into w x h; at o.min it is cut with an ellipsis. th: the height it takes. */
export function fit(g: G, s: string, o: FitOpts): { px: number; lines: string[]; th: number } {
  const { w = 920, h = 400, px = 96, min = 46, weight = 800, lh = 1.08 } = o;
  spacing(g, 0);
  for (let p = px; ; p -= 2) {
    font(g, p, weight);
    const fits = (t: string) => g.measureText(t).width <= w;
    const cap = Math.max(1, Math.min(6, Math.floor(h / (p * lh))));
    const lines = wrap(s, fits, 99);
    if ((lines.length <= cap && lines.every(fits)) || p <= min)
      return { px: p, lines: wrap(s, fits, cap), th: Math.min(lines.length, cap) * p * lh };
  }
}
/** the event's title, shrunk to its box, top at y. Returns the y below it. */
export function title(
  g: G,
  s: string,
  x: number,
  y: number,
  o: FitOpts & { color: string; align?: CanvasTextAlign },
): number {
  const { w = 920, weight = 800, lh = 1.08 } = o;
  const f = fit(g, s, o);
  g.save();
  font(g, f.px, weight);
  g.textAlign = o.align ?? "left";
  g.textBaseline = "alphabetic";
  g.fillStyle = o.color;
  f.lines.forEach((l, i) => g.fillText(l, x, y + i * f.px * lh + f.px * 0.82, w));
  g.restore();
  return y + f.th;
}
/** one number on one line, shrunk to maxW, centred on x with its baseline at `base` (the day in the date pane) */
export function bigNum(g: G, s: string, x: number, base: number, px: number, maxW: number, color: string): void {
  g.save();
  let size = px;
  const set = () => {
    font(g, size, 900);
    spacing(g, -size * 0.02);
    return g.measureText(s).width;
  };
  const w = set();
  if (w > maxW) {
    size *= maxW / w;
    set();
  }
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillStyle = color;
  g.fillText(s, x, base);
  g.restore();
}
interface Placed {
  color: string;
  align?: CanvasTextAlign;
  w?: number;
}
/** the time in a pill, top at y; x is the left edge or the centre */
function pill(g: G, s: string, x: number, y: number, o: Placed & { bg: string }): void {
  const { align = "left", w = 920 } = o;
  const pad = 46;
  const h = 108;
  g.save();
  font(g, 62, 800);
  spacing(g, 0);
  const tw = Math.min(g.measureText(s).width, w - 2 * pad);
  const x0 = align === "center" ? x - tw / 2 - pad : x;
  rr(g, x0, y, tw + 2 * pad, h, h / 2);
  g.fillStyle = o.bg;
  g.fill();
  g.fillStyle = o.color;
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText(s, x0 + pad, y + h / 2 + 2.5, tw);
  g.restore();
}
/** the place with a pin in front, top at y, up to o.max lines. Returns the y below. */
export function where(g: G, s: string, x: number, y: number, o: Placed & { px?: number; max?: number }): number {
  const { px = 50, align = "left", w = 920, max = 2 } = o;
  const ic = px * 0.95;
  g.save();
  font(g, px, 600);
  spacing(g, 0);
  const lines = wrap(s, (t) => g.measureText(t).width <= w - ic, max);
  const lw = Math.min(w - ic, Math.max(...lines.map((l) => g.measureText(l).width)));
  const x0 = align === "center" ? x - (lw + ic) / 2 : x;
  pin(g, x0 + px * 0.34, y + px * 0.9, px * 0.42, o.color);
  g.fillStyle = o.color;
  g.textAlign = "left";
  g.textBaseline = "alphabetic";
  lines.forEach((l, i) => g.fillText(l, x0 + ic, y + i * px * 1.18 + px * 0.82, w - ic));
  g.restore();
  return y + lines.length * px * 1.18;
}

// ---- layout ----
let pad: G | null = null;
/** a context nothing is seen on: text is measured there, and a design is run on it once to find out which map tiles it needs */
export function scratch(): G {
  pad ??= document.createElement("canvas").getContext("2d");
  if (!pad) throw new Error("no 2d canvas");
  return pad;
}
/** the height of a block that draws from y=0 and returns where it ends */
export function measure(fn: (g: G) => number): number {
  const g = scratch();
  g.save();
  const h = fn(g);
  g.restore();
  return h;
}
/** g with its origin moved for fn */
export function at<T>(g: G, x: number, y: number, fn: () => T): T {
  g.save();
  g.translate(x, y);
  const out = fn();
  g.restore();
  return out;
}
export interface StackOpts {
  w?: number;
  /** the facts' colour (the club's text colour by default), the time's, the title's */
  color?: string;
  accent?: string;
  tcolor?: string;
  align?: CanvasTextAlign;
  /** the title: its biggest and smallest size, weight, line height, and the most height it may take */
  tpx?: number;
  tmin?: number;
  tweight?: number;
  lh?: number;
  th?: number;
  /** the height there is for the whole stack: the title gets what date, time and place leave */
  H?: number;
  /** a short bar between title and date */
  bar?: boolean;
  /** the time large and plain, or in a pill of pillBg with pillFg text */
  time?: "big" | "pill";
  timePx?: number;
  pillBg?: string;
  pillFg?: string;
  /** sizes of the date and the place; lines of the place at most */
  dpx?: number;
  ppx?: number;
  pmax?: number;
}
/** date, time and place from y down. Returns the y below. */
function rest(g: G, d: Ctx, x: number, y0: number, o: StackOpts): number {
  const { w = 920, color = d.on, accent = color, align = "left", timePx = 100, dpx = 62, ppx = 52, pmax = 2 } = o;
  let y = y0;
  if (o.bar) {
    g.fillStyle = accent;
    g.fillRect(align === "center" ? x - 65 : x, y + 34, 130, 12);
    y += 46;
  }
  y = text(g, d.f.date, x, y + 38, { px: dpx, weight: 700, color, align, w });
  if (o.time === "pill") {
    pill(g, d.f.time, x, y + 14, { bg: o.pillBg ?? color, color: o.pillFg ?? d.c, align, w });
    y += 122;
  } else y = text(g, d.f.time, x, y + 2, { px: timePx, weight: 900, color: accent, align, w, lh: 1.1 });
  return d.e.location ? where(g, d.e.location, x, y + 24, { px: ppx, color, align, w, max: pmax }) : y;
}
/** The four facts as one stack from y=0: the title, then date, time and place. Returns its height. */
export function stack(g: G, d: Ctx, x: number, o: StackOpts = {}): number {
  const { w = 920, color = d.on, align = "left", tpx = 128, tmin = 48, tweight = 800, lh = 1.06 } = o;
  const room = o.H ? o.H - measure((q) => rest(q, d, x, 0, o)) : 400;
  const h = Math.max(120, Math.min(o.th ?? 520, room));
  const y = title(g, d.e.title, x, 0, {
    w,
    h,
    px: tpx,
    min: tmin,
    weight: tweight,
    color: o.tcolor ?? color,
    align,
    lh,
  });
  return rest(g, d, x, y, o);
}
/** the stack centred between top and bottom, its title sized to the room there is */
export function block(g: G, d: Ctx, top: number, bottom: number, x: number, o: StackOpts = {}): void {
  const opts = { H: bottom - top, ...o };
  const h = measure((q) => stack(q, d, x, opts));
  at(g, 0, Math.round(top + Math.max(0, (bottom - top - h) / 2)), () => stack(g, d, x, opts));
}
