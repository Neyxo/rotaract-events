// Pictures on the story canvas: loading (logos cut out of their SVG files, map tiles), fitting, the heavy blur, the crest as a
// watermark and the swisstopo map. Everything drawn must leave the canvas exportable: same origin, or sent with CORS headers (tiles).
import { SWISSTOPO_GREY } from "../geo";
import type { Coords } from "../types";
import { type Ctx, type G, INK, type Img, font, lum, mix, rgb, rr, spacing } from "./kit";

/** null when it does not load: a design draws without it */
export const load = (src: string, cors = false) =>
  new Promise<HTMLImageElement | null>((done) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });
const files = new Map<string, Promise<string>>();
/** A part of an SVG file (its viewBox set to `box`) as an image w x h: an SVG without a size of its own is drawn small and soft, or
 *  not at all (Firefox), so the size is written into it. */
export async function svgCut(url: string, box: string, w: number, h: number): Promise<HTMLImageElement | null> {
  if (!files.has(url))
    files.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.text() : ""))
        .catch(() => ""),
    );
  const svg = (await files.get(url)) ?? "";
  const open = svg.match(/<svg\b[^>]*>/)?.[0];
  if (!open) return null;
  const sized = open
    .replace(/\s(?:width|height|viewBox)="[^"]*"/g, "")
    .replace("<svg", `<svg viewBox="${box}" width="${w}" height="${h}"`);
  return load("data:image/svg+xml," + encodeURIComponent(svg.slice(svg.indexOf(open)).replace(open, sized)));
}

export const aspect = (img: Img): number =>
  img instanceof HTMLImageElement ? (img.naturalWidth || 1) / (img.naturalHeight || 1) : img.width / img.height;
const canvas = (w: number, h: number): [HTMLCanvasElement, G] => {
  const c = Object.assign(document.createElement("canvas"), { width: Math.ceil(w), height: Math.ceil(h) });
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("no 2d canvas");
  return [c, g];
};
/** the image whole inside the box, centred */
export function contain(g: G, img: Img, x: number, y: number, w: number, h: number): void {
  const a = aspect(img);
  const dw = Math.min(w, h * a);
  g.drawImage(img, x + (w - dw) / 2, y + (h - dw / a) / 2, dw, dw / a);
}
/** the image filling the box, cropped around its middle (ay: 0 keeps the top, 1 the bottom) */
export function cover(g: G, img: Img, x: number, y: number, w: number, h: number, ay = 0.5): void {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const k = Math.min(iw / w, ih / h);
  g.imageSmoothingQuality = "high";
  g.drawImage(img, (iw - w * k) / 2, (ih - h * k) * ay, w * k, h * k, x, y, w, h);
}
/** a one-colour mark (the lockup, the Rotary wordmark) in another colour, w x h */
export function tinted(img: Img, color: string, w: number, h: number): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
/** a heavy blur without ctx.filter (not in Safari): down to a few pixels and back up */
export function soft(img: Img): HTMLCanvasElement {
  const [small, g] = canvas(27, 48);
  cover(g, img, 0, 0, 27, 48);
  const [out, q] = canvas(108, 192);
  q.imageSmoothingQuality = "high";
  q.drawImage(small, 0, 0, 108, 192);
  return out;
}

/** a club whose "crest" is the Rotaract mark itself (Rotaract International) has none of its own: one wheel per picture */
export const ownCrest = (d: Ctx): Img | null => (d.club.logo.endsWith("rotaract.svg") ? null : d.crest);
const marks = new Map<string, HTMLCanvasElement>();
/** The crest as the app's cards carry it, as a watermark in one tone (the club colour, or `tone` on a colour ground): every part of
 *  it shows at half strength at least, so a white shield or a flag is still a shape, its dark parts stronger; fading towards the top
 *  left. A club without a crest of its own gets the wheel. Reads the pixels, so the crest must be same-origin. */
export function watermark(d: Ctx, size: number, tone?: string): HTMLCanvasElement | null {
  const src = ownCrest(d) ?? d.wheel;
  if (!src) return null;
  const key = [d.club.id, size, tone].join(":");
  const done = marks.get(key);
  if (done) return done;
  const [c, g] = canvas(size, size);
  contain(g, src, 0, 0, size, size);
  const im = g.getImageData(0, 0, size, size);
  const p = im.data;
  const [r, gr, b] = rgb(tone ?? (lum(d.c) > 0.45 ? mix(d.c, INK, 0.45) : d.c));
  for (let i = 0; i < p.length; i += 4) {
    const l = (0.2126 * (p[i] ?? 0) + 0.7152 * (p[i + 1] ?? 0) + 0.0722 * (p[i + 2] ?? 0)) / 255;
    p[i + 3] = (p[i + 3] ?? 0) * (0.5 + 0.5 * (1 - l));
    p[i] = r;
    p[i + 1] = gr;
    p[i + 2] = b;
  }
  g.putImageData(im, 0, 0);
  g.globalCompositeOperation = "destination-in";
  const fade = g.createLinearGradient(0, 0, size * 0.6, size * 0.6);
  fade.addColorStop(0, "rgba(0,0,0,.35)");
  fade.addColorStop(1, "#000");
  g.fillStyle = fade;
  g.fillRect(0, 0, size, size);
  marks.set(key, c);
  return c;
}

// ---- the map: swisstopo's grey tiles (web mercator), sent with CORS headers ----
const tiles = new Map<string, HTMLImageElement | null>();
const wanted = new Set<string>();
/** the tiles the last drawings asked for and did not have: loaded, so the next drawing has them. One that fails stays a grey patch. */
export async function loadTiles(): Promise<void> {
  const urls = [...wanted];
  wanted.clear();
  await Promise.all(urls.map(async (u) => tiles.set(u, await load(u, true))));
}
/** The map filling the box, `at` in its middle moved down by oy. Draws the tiles it has and notes the others (loadTiles). Returns
 *  where `at` is on the canvas. */
export function map(g: G, at: Coords, x: number, y: number, w: number, h: number, oy: number): [number, number] {
  const z = 15;
  const T = 384; // a 256px tile at 1.5x
  const n = 2 ** z;
  const tx = ((at[1] + 180) / 360) * n;
  const ty = ((1 - Math.asinh(Math.tan((at[0] * Math.PI) / 180)) / Math.PI) / 2) * n;
  const px = x + w / 2;
  const py = y + h / 2 + oy;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = "#e6e6e3";
  g.fillRect(x, y, w, h);
  for (let i = Math.floor(tx - (px - x) / T); i <= Math.floor(tx + (x + w - px) / T); i++)
    for (let j = Math.floor(ty - (py - y) / T); j <= Math.floor(ty + (y + h - py) / T); j++) {
      const url = SWISSTOPO_GREY.replace("{z}", String(z)).replace("{x}", String(i)).replace("{y}", String(j));
      const t = tiles.get(url);
      if (t) g.drawImage(t, Math.round(px + (i - tx) * T), Math.round(py + (j - ty) * T), T, T);
      else if (t === undefined) wanted.add(url);
    }
  g.restore();
  return [px, py];
}
/** swisstopo asks to be named on its maps; its right edge at x */
export function credit(g: G, x: number, y: number): void {
  g.save();
  font(g, 24, 600);
  spacing(g, 0);
  const w = g.measureText("© swisstopo").width;
  rr(g, x - w - 24, y, w + 24, 38, 10);
  g.fillStyle = "rgba(255,255,255,.8)";
  g.fill();
  g.fillStyle = INK;
  g.textAlign = "right";
  g.textBaseline = "middle";
  g.fillText("© swisstopo", x - 12, y + 20);
  g.restore();
}
