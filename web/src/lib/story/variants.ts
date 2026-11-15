// The ten story pictures. Each draws the whole 1080x1920 picture from a Ctx; title, date, time and place stay between y=250 and
// y=1580 (Instagram covers the rest with its own controls). No link in any of them: a story's link is a sticker the user adds.
import { clubWord } from "./facts";
import { cog24, cogFill, cogLine, cogN, cogPath, meshRot, toothAt } from "./cog";
import { MESH } from "./cogdata";
import {
  type Ctx,
  type G,
  CRAN,
  GOLD,
  H,
  HOT,
  INK,
  LOGO,
  M,
  MUTED,
  PAPER,
  PLUM,
  ROYAL,
  W,
  WHITE,
  WINE,
  alpha,
  at,
  bigNum,
  block,
  darken,
  fill,
  fit,
  glow,
  grad,
  lighten,
  lum,
  measure,
  mix,
  pin,
  rr,
  scratch,
  text,
  title,
  where,
} from "./kit";
import { aspect, cover, credit, map, soft, tinted, watermark } from "./media";
import {
  brand,
  chip,
  duotone,
  factsW,
  farBrand,
  headBand,
  logo,
  plain,
  rowTop,
  rowTopOwn,
  sheet,
  softCrest,
  wash,
  web,
  wordRows,
} from "./parts";

/** the white footer of Swiss type: a line of the lockup's red, the lockup, the club chip */
function footBand(g: G, d: Ctx, y: number): void {
  g.fillStyle = WHITE;
  g.fillRect(0, y, W, H - y);
  g.fillStyle = LOGO;
  g.fillRect(0, y, W, 8);
  logo(g, d, M, y + 42, 120);
  chip(g, d, W - M, y + 52, { max: 400 });
}
/** the event's map in a box with its pin in the club colour (only on the event's own place) and swisstopo's credit at (cx, cy) */
function mapBox(
  g: G,
  d: Ctx,
  box: [number, number, number, number],
  oy: number,
  s: number,
  cx: number,
  cy: number,
): void {
  if (d.media.kind !== "map") return;
  const [x, y] = map(g, d.media.at, ...box, oy);
  if (d.media.exact) pin(g, x, y, s, d.c, true);
  credit(g, cx, cy);
}

// ---- 1: the club's word, large and faint, behind the facts ----
function club(g: G, d: Ctx): void {
  duotone(g, d);
  wordRows(g, clubWord(d.club), d.on, d.on === "#fff" ? 0.15 : 0.09);
  brand(g, d, M, 280, 110, d.on);
  chip(g, d, M, 1470, { align: "left", shadow: true });
  block(g, d, 440, 1430, M, { tpx: 170, tweight: 900, lh: 1.04, bar: true });
}

// ---- 2: the app's event card ----
/** a frosted card: white veil, the club colour washing in from the left, a highlight on top, a white edge */
function glass(g: G, d: Ctx, x: number, y: number, w: number, h: number): void {
  g.save();
  g.shadowColor = alpha(INK, 0.28);
  g.shadowBlur = 60;
  g.shadowOffsetY = 22;
  rr(g, x, y, w, h, 56);
  g.fillStyle = "rgba(255,255,255,.9)";
  g.fill();
  g.restore();
  g.save();
  rr(g, x, y, w, h, 56);
  g.clip();
  const q = g.createLinearGradient(x, y, x + w * 0.5, y + w * 0.18);
  q.addColorStop(0, alpha(d.c, 0.2));
  q.addColorStop(1, alpha(d.c, 0));
  g.fillStyle = q;
  g.fillRect(x, y, w, h);
  const hi = g.createLinearGradient(0, y, 0, y + 150);
  hi.addColorStop(0, "rgba(255,255,255,.55)");
  hi.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = hi;
  g.fillRect(x, y, w, 150);
  g.restore();
  rr(g, x, y, w, h, 56);
  g.strokeStyle = "rgba(255,255,255,.95)";
  g.lineWidth = 3;
  g.stroke();
}
/** the app's date pane: day and month in the club colour on a white tile */
function datePane(g: G, d: Ctx, y: number, w: number, h: number): void {
  const col = lum(d.c) > 0.45 ? mix(d.c, INK, 0.5) : darken(d.c, 0.15);
  g.save();
  g.shadowColor = alpha(darken(d.c, 0.3), 0.45);
  g.shadowBlur = 30;
  g.shadowOffsetY = 12;
  rr(g, 0, y, w, h, 30);
  g.fillStyle = "rgba(255,255,255,.95)";
  g.fill();
  g.restore();
  g.save();
  rr(g, 0, y, w, h, 30);
  g.clip();
  const q = g.createLinearGradient(0, y, 0, y + h);
  q.addColorStop(0, alpha(d.c, 0));
  q.addColorStop(1, alpha(d.c, 0.12));
  g.fillStyle = q;
  g.fillRect(0, y, w, h);
  g.restore();
  bigNum(g, d.f.big, w / 2, y + h * 0.6, 104, w - 40, col);
  text(g, d.f.mon, w / 2, y + h * 0.66, {
    px: 38,
    weight: 800,
    color: col,
    align: "center",
    upper: true,
    ls: 3,
    w: w - 30,
  });
}
/** The card's content from its top-left corner: the lockup and the club, the title (th high at most), the date pane with weekday
 *  and time beside it, the place. big: no banner above, so everything is larger. Returns its height. */
function cardBody(g: G, d: Ctx, w: number, th: number, big: boolean): number {
  const col = lum(d.c) > 0.45 ? mix(d.c, INK, 0.5) : d.c;
  const ph = big ? 236 : 190;
  const pw = (d.f.multi ? 310 : 200) * (big ? 1.2 : 1);
  const x = pw + 36;
  logo(g, d, 0, 0, 84);
  text(g, d.club.name, w, 24, { px: 32, weight: 600, color: MUTED, align: "right", w: w - 320 });
  const y = title(g, d.e.title, 0, 120, { w, h: th, px: big ? 210 : 150, min: 46, color: INK, lh: 1.05 }) + 34;
  datePane(g, d, y, pw, ph);
  text(g, d.f.wd, x, y + (big ? 24 : 16), { px: big ? 62 : 54, weight: 600, color: MUTED, w: w - x });
  text(g, d.f.time, x, y + (big ? 100 : 82), { px: big ? 108 : 90, weight: 900, color: col, w: w - x });
  return d.e.location ? where(g, d.e.location, 0, y + ph + 30, { px: 50, color: INK, w }) : y + ph;
}
/** the ground behind the card: the picture blurred and tinted, or a mesh of the club colour */
function cardGround(g: G, d: Ctx): void {
  if (d.pic) {
    cover(g, soft(d.pic), -40, -40, W + 80, H + 80);
    fill(g, alpha(d.c, 0.3));
    fill(g, alpha(PAPER, 0.2));
    return;
  }
  fill(g, d.c);
  glow(g, 120, 520, 800, lighten(d.c, 0.55), 0.95);
  glow(g, 1020, 900, 700, farBrand(d.c), 0.75);
  glow(g, 200, 1560, 850, darken(d.c, 0.45), 0.9);
  glow(g, 1000, 1850, 650, lighten(d.c, 0.4), 0.8);
}
function card(g: G, d: Ctx): void {
  const X = 70;
  const CW = 940;
  const w = CW - 100;
  const big = d.media.kind === "none";
  // what the title and the banner share of the safe area: the title first, the banner the rest (cropped rather than squeezing it)
  const tail =
    34 + (big ? 236 : 190) + (d.e.location ? measure((m) => where(m, d.e.location, 0, 30, { color: INK, w })) : 0);
  const room = 1552 - 270 - 46 - 84 - 36 - tail - 50;
  const want = fit(scratch(), d.e.title, { w, h: 380, px: 150, min: 46, lh: 1.05 }).th;
  const full = d.pic ? CW / aspect(d.pic) : 430;
  const bh = big ? 0 : Math.round(Math.max(300, Math.min(full, 540, room - want)));
  const th = Math.min(big ? 640 : 420, room - bh);
  const ch = bh + 46 + measure((m) => cardBody(m, d, w, th, big)) + 50;
  const y0 = Math.round(Math.max(270, (270 + 1552) / 2 - ch / 2));
  const wm = watermark(d, 560);
  cardGround(g, d);
  glass(g, d, X, y0, CW, ch);
  g.save();
  rr(g, X, y0, CW, ch, 56);
  g.clip();
  if (wm) {
    // the club as the card's backdrop, as on the app's cards
    g.save();
    g.globalAlpha = 0.22;
    g.translate(X + CW - 170, y0 + ch - 190);
    g.rotate((-10 * Math.PI) / 180);
    g.drawImage(wm, -280, -280);
    g.restore();
  }
  if (d.pic) cover(g, d.pic, X, y0, CW, bh, 0.3); // faces sit in the upper part
  mapBox(g, d, [X, y0, CW, bh], 50, 56, X + CW - 20, y0 + bh - 54);
  g.restore();
  at(g, X + 50, y0 + bh + 46, () => cardBody(g, d, w, th, big));
}

// ---- 3: Swiss type on the club colour, the crest soft behind ----
function swiss(g: G, d: Ctx): void {
  const y = 1392;
  g.fillStyle = wash(g, d, true, 0, 0, W * 0.8, y);
  g.fillRect(0, 0, W, y);
  g.save();
  g.beginPath();
  g.rect(0, 0, W, y);
  g.clip();
  softCrest(g, d, 800, 1010, 980, true);
  g.restore();
  g.fillStyle = d.on;
  g.fillRect(M, 276, 920, 12);
  footBand(g, d, y);
  block(g, d, 320, 1356, M, { tpx: 190, tmin: 54, lh: 1.0, dpx: 64, timePx: 112, ppx: 52 });
}

// ---- 4: the picture or the map as a band, the facts on a light sheet ----
function band(g: G, d: Ctx): void {
  const has = d.media.kind !== "none";
  const top = has ? 890 : 432;
  fill(g, PAPER);
  if (d.pic) cover(g, d.pic, 0, 440, W, 480, 0.35);
  mapBox(g, d, [0, 432, W, 490], 10, 60, 1056, 838);
  const q = wash(g, d, false, 0, top, W * 0.8, H * 0.9);
  if (has) sheet(g, top, q);
  else {
    g.fillStyle = q;
    g.fillRect(0, top, W, H - top);
  }
  g.save();
  g.beginPath();
  g.rect(0, top + 60, W, H);
  g.clip();
  softCrest(g, d, 800, has ? 1470 : 1240, has ? 860 : 980, false);
  g.restore();
  headBand(g, d, d.pic ? 0 : 8);
  block(g, d, has ? 940 : 490, 1548, M, { color: INK, tpx: 170, time: "pill", pillBg: d.c, pillFg: d.on });
}

// ---- 5: Rotaract's own cranberry ----
function cranberry(g: G, d: Ctx): void {
  plain(g, CRAN);
  headBand(g, d, 0);
  block(g, d, 500, 1548, M, { color: WHITE, tpx: 170, dpx: 64, timePx: 108, ppx: 52 });
}

// ---- 6: one large cog in fine lines ----
function cog(g: G, d: Ctx): void {
  grad(g, [HOT, CRAN, WINE], 0, 0, W * 0.4, H);
  cogLine(g, cog24(800), 930, 1420, 0.06, WHITE, 0.42);
  rowTop(g, d);
  factsW(g, d, 480, 1548);
}

// ---- 7: the cog rising under a white header whose toothed seam runs around the same centre ----
function dome(g: G, d: Ctx): void {
  const cx = 540;
  const cy = 1960;
  const seam = cogN(96, 1530); // the logo's tooth, fine: its tips on one of the rings (760 + 7 x 110)
  fill(g, WHITE);
  g.save();
  g.clip(cogPath(seam, cx, cy, toothAt(seam, -Math.PI / 2), "outer"));
  grad(g, [lighten(CRAN, 0.1), CRAN, PLUM]);
  web(g, cx, cy, 760, 110, 0.95);
  g.restore();
  cogFill(g, cog24(660), cx, cy, (8 * Math.PI) / 180, WHITE, 0.97);
  rowTopOwn(g, d, 268, 116);
  factsW(g, d, 620, 1262, { th: 340 });
}

// ---- 8: three cogs of one tooth size whose teeth interlock ----
function clockwork(g: G, d: Ctx): void {
  const a = cogN(30, 400);
  const x = 900;
  const y = 1650;
  fill(g, WHITE);
  glow(g, x, y, 900, lighten(CRAN, 0.86), 0.9);
  cogLine(g, a, x, y, 0, CRAN, 0.6);
  // the two small ones each engage the large one: direction from it, teeth, radius, distance of the centres
  const small: [number, number, number, number][] = [
    [Math.PI + 0.32, 18, 240, MESH[0]],
    [-1.3, 12, 160, MESH[1]],
  ];
  for (const [th, n, R, dist] of small) {
    const b = cogN(n, R);
    cogLine(g, b, x + dist * Math.cos(th), y + dist * Math.sin(th), meshRot(a, 0, b, th), CRAN, 0.6);
  }
  rowTopOwn(g, d);
  block(g, d, 470, 1180, M, { w: 780, color: INK, tcolor: CRAN, accent: CRAN, tpx: 170, timePx: 104, pmax: 3 });
}

// ---- 9, 10: the Rotary templates: royal blue and gold, the wheel untouched ----
/** a Rotary event names the club that hosts it */
const host = (d: Ctx) => d.e.organiser || d.club.name;
function rotaryWord(g: G, d: Ctx, x: number, y: number, h: number, centre = false): void {
  if (!d.rotaryWord) return;
  const w = h * aspect(d.rotaryWord);
  g.drawImage(tinted(d.rotaryWord, WHITE, w, h), centre ? x - w / 2 : x, y);
}
function rotaryEmblem(g: G, d: Ctx): void {
  const cx = 540;
  const q = g.createRadialGradient(cx, 452, 100, cx, 452, 1500);
  q.addColorStop(0, lighten(ROYAL, 0.14));
  q.addColorStop(1, darken(ROYAL, 0.38));
  fill(g, q);
  web(g, cx, 452, 222, 95, 1.2);
  if (d.rotaryWheel) g.drawImage(d.rotaryWheel, cx - 170, 282, 340, 340);
  rotaryWord(g, d, cx, 650, 84, true);
  text(g, host(d), cx, 752, { px: 34, weight: 600, color: WHITE, align: "center", a: 0.9 });
  block(g, d, 836, 1548, cx, { align: "center", color: WHITE, tpx: 160, time: "pill", pillBg: GOLD, pillFg: ROYAL });
}
function rotaryRising(g: G, d: Ctx): void {
  grad(g, [lighten(ROYAL, 0.12), darken(ROYAL, 0.4)]);
  web(g, 540, 1960, 760, 110, 0.95);
  if (d.rotaryWheel) {
    g.save();
    g.imageSmoothingQuality = "high";
    g.translate(540, 1960);
    g.rotate((8 * Math.PI) / 180);
    g.drawImage(d.rotaryWheel, -660, -660, 1320, 1320);
    g.restore();
  }
  rotaryWord(g, d, M, 276, 110);
  text(g, host(d), W - M, 312, { px: 34, weight: 600, color: WHITE, align: "right", a: 0.9, w: 500 });
  block(g, d, 500, 1262, M, { color: WHITE, th: 340, tpx: 170 });
}

export interface Variant {
  id: string;
  /** what the picker's button is called */
  name: string;
  /** a Rotary template: all an event of the Rotary layer is offered */
  rotary?: true;
  draw: (g: G, d: Ctx) => void;
}
export const VARIANTS: Variant[] = [
  { id: "club", name: "Club name in the background", draw: club },
  { id: "card", name: "App card", draw: card },
  { id: "swiss", name: "Swiss type", draw: swiss },
  { id: "band", name: "Picture or map", draw: band },
  { id: "cranberry", name: "Rotaract cranberry", draw: cranberry },
  { id: "cog", name: "One large cog", draw: cog },
  { id: "dome", name: "Cog rising", draw: dome },
  { id: "clockwork", name: "Clockwork", draw: clockwork },
  { id: "rotary-emblem", name: "Rotary emblem", rotary: true, draw: rotaryEmblem },
  { id: "rotary-rising", name: "Rotary wheel rising", rotary: true, draw: rotaryRising },
];
