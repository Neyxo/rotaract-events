// The pieces the ten designs share: the Rotaract lockup (as it is, or in one colour), the club as the app's chip, the header band,
// and the grounds (the duotone, the wash that comes from the crest, the web of rings).
import { BRAND } from "../color";
import { clubPlace } from "./facts";
import {
  type Ctx,
  type G,
  type StackOpts,
  CRAN,
  H,
  INK,
  LOGO,
  M,
  PAPER,
  W,
  WHITE,
  alpha,
  block,
  darken,
  disc,
  fill,
  font,
  grad,
  lighten,
  mix,
  rgb,
  rr,
  spacing,
} from "./kit";
import { aspect, contain, ownCrest, tinted, watermark } from "./media";

// ---- brand ----
/** the official lockup as it is: its own colour, h high, top left at (x, y) */
export function logo(g: G, d: Ctx, x: number, y: number, h: number): void {
  if (!d.mark) return;
  g.save();
  g.imageSmoothingQuality = "high";
  g.drawImage(d.mark, x, y, h * aspect(d.mark), h);
  g.restore();
}
/** the lockup in one colour (white on a colour ground) */
export function brand(g: G, d: Ctx, x: number, y: number, h: number, color: string): void {
  if (d.mark) g.drawImage(tinted(d.mark, color, h * aspect(d.mark), h), x, y);
}
interface ChipOpts {
  align?: "left" | "right";
  /** the name's width at most: a long one gets smaller */
  max?: number;
  /** the border; the app's is 35% club colour */
  line?: string;
  /** the dot of a club without a crest */
  dot?: string;
  shadow?: boolean;
}
/** The club as the app's chip (.chip.club) at 3.3x, with the place as its text: white, 8px corners, the crest unframed. */
export function chip(g: G, d: Ctx, x: number, y: number, o: ChipOpts = {}): void {
  const { align = "right", max = 520, line = mix(WHITE, d.c, 0.35), dot = d.c } = o;
  const h = 100;
  const pad = 33;
  const ic = 53;
  const name = clubPlace(d.club.name);
  const crest = ownCrest(d);
  g.save();
  spacing(g, 0);
  for (let px = 42; px >= 30; px -= 2) {
    font(g, px, 600);
    if (g.measureText(name).width <= max) break;
  }
  const tw = Math.min(g.measureText(name).width, max);
  const lead = pad + (crest ? ic : 33) + 20;
  const w = lead + tw + pad;
  const x0 = align === "right" ? x - w : x;
  if (o.shadow) {
    g.shadowColor = "rgba(30,0,20,.3)";
    g.shadowBlur = 26;
    g.shadowOffsetY = 10;
  }
  rr(g, x0, y, w, h, 26);
  g.fillStyle = WHITE;
  g.fill();
  g.shadowColor = "transparent";
  g.lineWidth = 3;
  g.strokeStyle = line;
  g.stroke();
  g.fillStyle = INK;
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.fillText(name, x0 + lead, y + h / 2 + 2, tw);
  g.restore();
  if (crest) contain(g, crest, x0 + pad, y + (h - ic) / 2, ic, ic);
  else disc(g, x0 + pad + 16, y + h / 2, 16, dot);
}
const NO_LINE = "rgba(255,255,255,0)";
/** the top row on cranberry: the lockup in white on the left, the club chip (no club colour in it) on the right */
export function rowTop(g: G, d: Ctx): void {
  brand(g, d, M, 280, 110, WHITE);
  chip(g, d, W - M, 285, { max: 330, line: NO_LINE, dot: CRAN, shadow: true });
}
/** the same row on white: the lockup in its own colour, the chip with a hairline */
export function rowTopOwn(g: G, d: Ctx, y = 280, h = 124): void {
  logo(g, d, M, y, h);
  chip(g, d, W - M, y + 12 - (124 - h) / 2, { max: 330, line: "#dedae5", dot: CRAN });
}
/** A white header band like the app's own: the lockup left, the club chip right, a line of the lockup's red below (lh thick).
 *  Content starts at about y=470. */
export function headBand(g: G, d: Ctx, lh: number): void {
  g.fillStyle = WHITE;
  g.fillRect(0, 0, W, 440);
  g.fillStyle = LOGO;
  g.fillRect(0, 440 - lh, W, lh);
  logo(g, d, M, 284, 120);
  chip(g, d, W - M, 294, { max: 330 });
}
/** the facts in white on the cranberry designs: the time large and plain */
export const factsW = (g: G, d: Ctx, top: number, bottom: number, o: StackOpts = {}): void =>
  block(g, d, top, bottom, M, { color: WHITE, tpx: 170, timePx: 104, ...o });

// ---- grounds ----
/** a colour, a touch lighter above and darker below */
export function plain(g: G, c: string): void {
  fill(g, c);
  const q = g.createLinearGradient(0, 0, 0, H);
  q.addColorStop(0, "rgba(255,255,255,.1)");
  q.addColorStop(1, "rgba(0,0,0,.2)");
  fill(g, q);
}
/** rings and spokes around (cx, cy): plain geometry, the "spider web" of the wheel designs */
export function web(g: G, cx: number, cy: number, r0: number, step: number, a: number): void {
  g.save();
  g.lineWidth = 3;
  g.strokeStyle = alpha(WHITE, 0.11 * a);
  for (let r = r0; r < 2400; r += step) {
    g.beginPath();
    g.arc(cx, cy, r, 0, 2 * Math.PI);
    g.stroke();
  }
  g.strokeStyle = alpha(WHITE, 0.065 * a);
  for (let i = 0; i < 36; i++) {
    const t = (i * Math.PI) / 18;
    g.beginPath();
    g.moveTo(cx + r0 * Math.cos(t), cy + r0 * Math.sin(t));
    g.lineTo(cx + 2500 * Math.cos(t), cy + 2500 * Math.sin(t));
    g.stroke();
  }
  g.restore();
}
/** a sheet from y down with rounded top corners */
export function sheet(g: G, y: number, color: string | CanvasGradient): void {
  rr(g, 0, y, W, H - y + 80, 56);
  g.fillStyle = color;
  g.fill();
}
const saturation = (hex: string): number => {
  const [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === mn ? 0 : (mx - mn) / (1 - Math.abs(mx + mn - 1));
};
const far = (c: string, k: string) => rgb(c).reduce((s, v, i) => s + (v - (rgb(k)[i] ?? 0)) ** 2, 0);
/** cranberry or azure, whichever is further from c: the second colour of a mesh */
export const farBrand = (c: string): string => (far(c, CRAN) > far(c, BRAND.azure) ? CRAN : BRAND.azure);
/** The second colour of the duotone: the club colour mixed 70% into the farther of cranberry and azure. Only where that gradient
 *  would run through mud (its middle keeps under 30% of the colour's saturation: green into cranberry) the nearer one is taken. */
export function partner(c: string): string {
  const a = farBrand(c);
  const b = a === CRAN ? BRAND.azure : CRAN;
  const muddy = (p: string) => saturation(mix(c, mix(c, p, 0.7), 0.5)) < 0.3 * saturation(c);
  return mix(c, muddy(a) && !muddy(b) ? b : a, 0.7);
}
/** the club colour running into its partner, corner to corner; a light colour into a lighter tone of itself */
export function duotone(g: G, d: Ctx): void {
  grad(g, [d.c, d.on === "#fff" ? partner(d.c) : lighten(d.c, 0.55)], 0, 0, W, H);
}
/** The ground that says where the colour comes from, as on the app's club page. rich: the colour into a darker tone of itself (a
 *  light colour into a lighter one), for white or ink type; otherwise the light wash, the colour fading into paper, for ink type. */
export function wash(g: G, d: Ctx, rich: boolean, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const q = g.createLinearGradient(x0, y0, x1, y1);
  const dark = d.on === "#fff" ? darken(d.c, 0.38) : lighten(d.c, 0.5);
  q.addColorStop(0, rich ? d.c : mix(PAPER, d.c, 0.34));
  q.addColorStop(1, rich ? dark : mix(PAPER, d.c, 0.05));
  return q;
}
/** the crest large and very soft behind the facts, centred on (x, y): turned a little as on the app's cards, a flag kept level */
export function softCrest(g: G, d: Ctx, x: number, y: number, size: number, rich: boolean): void {
  const crest = ownCrest(d);
  if (!crest) return; // the Rotaract mark as a crest: the wash alone, no second, altered wheel
  // on the colour itself the crest is white (ink on a light colour); on the light wash it keeps the club colour
  const [tone, a] = d.on === "#fff" ? [WHITE, 0.15] : [INK, 0.09];
  const wm = watermark(d, 900, rich ? tone : undefined);
  if (!wm) return;
  g.save();
  g.globalAlpha *= rich ? a : 0.17;
  g.translate(x, y);
  if (aspect(crest) < 1.25) g.rotate((-10 * Math.PI) / 180);
  g.drawImage(wm, -size / 2, -size / 2, size, size);
  g.restore();
}

// ---- the club's word in outline ----
const words = new Map<string, { cv: HTMLCanvasElement; w: number; pad: number; base: number }>();
/** A word in outline, one clean contour per letter: stroked at double width on its own canvas, then the letter bodies punched out,
 *  so the contour pieces that overlap inside a glyph (the "A") never show. The letter spacing keeps neighbouring strokes apart. */
function outline(s: string, color: string) {
  const key = s + color;
  const done = words.get(key);
  if (done) return done;
  const px = 330;
  const pad = 14;
  const base = pad + Math.round(px * 0.86);
  const cv = document.createElement("canvas");
  const q = cv.getContext("2d");
  if (!q) throw new Error("no 2d canvas");
  const set = () => {
    font(q, px, 900);
    spacing(q, 15);
    q.textBaseline = "alphabetic";
    q.lineJoin = "round";
  };
  set();
  const w = q.measureText(s).width;
  cv.width = Math.ceil(w + 2 * pad);
  cv.height = Math.ceil(px * 1.1 + 2 * pad);
  set(); // sizing the canvas reset it
  q.lineWidth = 10;
  q.strokeStyle = color;
  q.strokeText(s, pad, base);
  q.globalCompositeOperation = "destination-out";
  q.fillText(s, pad, base);
  const out = { cv, w, pad, base };
  words.set(key, out);
  return out;
}
/** The word in rows behind the facts, from y=506 down (the lockup above keeps its clear space), always at full size: a long word
 *  runs off the picture and carries on in the next row. */
export function wordRows(g: G, word: string, color: string, a: number): void {
  const o = outline(word + " ", color);
  g.save();
  g.globalAlpha *= a;
  for (let i = 0; 747 + i * 300 < H + 330; i++)
    for (let x = -40 - ((i * 860) % o.w); x < W; x += o.w) g.drawImage(o.cv, x - o.pad, 747 + i * 300 - o.base);
  g.restore();
}
