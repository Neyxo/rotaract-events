// An event as a story picture (1080x1920, Instagram's format), drawn on a canvas in one of ten designs (story/variants.ts). The picker
// of the share popup shows them as thumbnails; the one tapped is drawn at full size and shared as a PNG. Loaded only when that picker
// opens (Event.tsx imports it dynamically). No link in the picture: Links.shareStory copies it for the link sticker.
import { BRAND, onColor } from "./color";
import { facts, storyMedia } from "./story/facts";
import { type Ctx, H, W, scratch } from "./story/kit";
import { load, loadTiles, svgCut } from "./story/media";
import { VARIANTS, type Variant } from "./story/variants";
import type { Club, Event } from "./types";

export { wrap } from "./story/kit";
export { clubPlace, clubWord, storyMedia } from "./story/facts";
export type { Variant };
export const STORY_VARIANTS = VARIANTS;
/** the designs an event is offered: a Rotaract event all ten (the two Rotary templates last), a Rotary event only those two */
export const storyVariants = (e: Pick<Event, "layer">): Variant[] =>
  e.layer === "rotary" ? VARIANTS.filter((v) => v.rotary) : VARIANTS;

/** Everything the designs draw from, loaded before any of them draws. A picture that does not load falls back to the map. */
async function context(e: Event, club: Club): Promise<Ctx> {
  const first = storyMedia(e, club);
  const [crest, mark, wheel, rotaryWheel, rotaryWord, pic] = await Promise.all([
    club.logo ? load(club.logo) : null,
    svgCut("rotaract.svg", "0 0 469.3132 149.5656", 1408, 449),
    svgCut("rotaract.svg", "320 0 149.3 149.6", 600, 600),
    svgCut("img/fam/rotary.svg", "242 1 146 146", 1400, 1400),
    svgCut("img/fam/rotary.svg", "4 39 224 74", 896, 296),
    first.kind === "pic" ? load(first.src) : null,
  ]);
  const media = first.kind === "pic" && !pic ? storyMedia({ coords: e.coords }, club) : first;
  const c = club.color || BRAND.cranberry;
  return { e, club, c, on: onColor(c), f: facts(e), media, crest, pic, mark, wheel, rotaryWheel, rotaryWord };
}
let last: { key: string; ctx: Promise<Ctx> } | null = null;
/** one load for the thumbnails and the picture that follows */
function contextOf(e: Event, club: Club): Promise<Ctx> {
  const key = e.id + "|" + club.id;
  if (last?.key !== key) last = { key, ctx: context(e, club) };
  return last.ctx;
}

/** one design on a canvas of any size (9:16) */
async function paint(canvas: HTMLCanvasElement, v: Variant, d: Ctx): Promise<void> {
  const g = canvas.getContext("2d");
  if (!g) throw new Error("no 2d canvas");
  if (d.media.kind === "map") {
    // a dry run notes the map tiles this design needs (where its map lies can depend on the title's height), then they are loaded
    const dry = scratch();
    dry.save();
    v.draw(dry, d);
    dry.restore();
    await loadTiles();
  }
  g.save();
  g.scale(canvas.width / W, canvas.width / W);
  v.draw(g, d);
  g.restore();
}
const variant = (id: string): Variant => VARIANTS.find((v) => v.id === id) ?? VARIANTS[0]!;

/** a design as a thumbnail on the picker's own small canvas */
export async function storyThumb(canvas: HTMLCanvasElement, e: Event, lead: Club, id: string): Promise<void> {
  await paint(canvas, variant(id), await contextOf(e, lead));
}
/** the picture as a PNG file, named after the event */
export async function storyImage(e: Event, lead: Club, id: string): Promise<File> {
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  await paint(canvas, variant(id), await contextOf(e, lead));
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
  if (!blob) throw new Error("no picture");
  return new File([blob], `${e.id}.png`, { type: "image/png" });
}
