// An event as a story picture (1080x1920, Instagram's format), drawn on a canvas: the lead club's colour and crest, title, when, where
// and the share link as text. Without the event's photo: the clubs' sites send no CORS headers, and a canvas with such a picture on
// it can't be exported.
import { BRAND, onColor } from "./color";
import { whenLong } from "./dates";
import type { Club, Event } from "./types";

const W = 1080;
const H = 1920;
const PAD = 96;

/** greedy word wrap into at most `max` lines; what does not fit is cut with an ellipsis */
export function wrap(text: string, fits: (s: string) => boolean, max: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1);
    if (last !== undefined && fits(`${last} ${word}`)) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.length <= max ? lines : [...lines.slice(0, max - 1), `${lines[max - 1]}…`];
}

const load = (src: string) =>
  new Promise<HTMLImageElement | null>((done) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });

/** the picture as a PNG file; link: the address printed at the bottom (a story's real link is a sticker the user adds) */
export async function storyImage(e: Event, lead: Club, link: string): Promise<File> {
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d canvas");
  const color = lead.color || BRAND.cranberry;
  const family = getComputedStyle(document.body).fontFamily;
  const inner = W - 2 * PAD;
  let y = 300; // Instagram covers the top ~250px and the bottom ~340px with its own controls

  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  const shade = g.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,.18)");
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);

  const crest = lead.logo ? await load(lead.logo) : null;
  if (crest) {
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(PAD + 110, y + 110, 110, 0, 2 * Math.PI);
    g.fill();
    const k = 130 / Math.max(crest.naturalWidth, crest.naturalHeight, 1);
    const [w, h] = [crest.naturalWidth * k || 130, crest.naturalHeight * k || 130];
    g.drawImage(crest, PAD + 110 - w / 2, y + 110 - h / 2, w, h);
    y += 300;
  }

  g.fillStyle = onColor(color);
  g.textBaseline = "top";
  /** lines of one text block, y moved below it */
  const block = (text: string, px: number, weight: number, max: number, gap: number) => {
    g.font = `${weight} ${px}px ${family}`;
    for (const line of wrap(text, (s) => g.measureText(s).width <= inner, max)) {
      g.fillText(line, PAD, y, inner);
      y += px * 1.15;
    }
    y += gap;
  };
  block(lead.name, 44, 600, 1, 28);
  block(e.title, 92, 800, 5, 48);
  block(whenLong(e), 50, 500, 2, 16);
  if (e.location) block(e.location, 50, 500, 2, 0);

  y = H - 480;
  block("Rotaract Events", 40, 700, 1, 4);
  g.globalAlpha = 0.8;
  block(link.replace(/^https?:\/\//, ""), 34, 500, 1, 0);

  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
  if (!blob) throw new Error("no picture");
  return new File([blob], `${e.id}.png`, { type: "image/png" });
}
