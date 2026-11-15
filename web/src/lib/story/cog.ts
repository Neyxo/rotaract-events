// The cog of the cog designs: the wheel of the Rotaract lockup without its lettering (cogdata.ts), solid or as fine lines, and the
// same cog with another number of teeth: the logo's own tooth repeated at one size, so cogs of different sizes interlock.
import { CX, CY, INNER, OUTER, PROFILE, ROOT, SIGN, TH0, THETA0, TIP, UC } from "./cogdata";
import type { G } from "./kit";

/** a cog around (0, 0) in picture units */
export interface Cog {
  /** the whole cog: filled it is solid (its openings are holes), stroked it is the line cog */
  all: Path2D;
  /** the toothed outline alone: a clip */
  outer: Path2D;
  /** radius to the tips of the teeth */
  R: number;
  /** the direction of the middle of one tooth, and the angle from tooth to tooth */
  th0: number;
  pitch: number;
}
const made = new Map<string, Cog>();
const deg = (rad: number) => (rad * 180) / Math.PI;

/** the logo's cog exactly (24 teeth), R to the tips of its teeth */
export function cog24(R: number): Cog {
  const key = "24|" + R;
  const done = made.get(key);
  if (done) return done;
  const m = new DOMMatrix().scale(R / TIP).translate(-CX, -CY);
  const all = new Path2D();
  all.addPath(new Path2D(OUTER + INNER), m);
  const outer = new Path2D();
  outer.addPath(new Path2D(OUTER), m);
  const c = { all, outer, R, th0: TH0, pitch: Math.PI / 12 };
  made.set(key, c);
  return c;
}
/** The logo's cog with n teeth and R to their tips: the true tooth, at the size it has on a 24-tooth cog of the same pitch,
 *  repeated n times; the inner parts (rim band, spokes, hub, keyway) are the logo's, scaled with the circle at the foot of the teeth. */
export function cogN(n: number, R: number): Cog {
  const key = n + "|" + R;
  const done = made.get(key);
  if (done) return done;
  const R24 = (R * 24) / n; // the 24-tooth cog whose teeth are this size
  const step = ((2 * Math.PI) / n) * SIGN;
  const outer = new Path2D();
  for (let i = 0; i < n; i++)
    for (const [u, rho] of PROFILE) {
      const a = (i + u) * step;
      const r = R - (1 - rho) * R24;
      outer.lineTo(r * Math.cos(a), r * Math.sin(a));
    }
  outer.closePath();
  const root = R - (1 - ROOT) * R24;
  const all = new Path2D();
  all.addPath(outer);
  all.addPath(
    new Path2D(INNER),
    new DOMMatrix()
      .rotate(-deg(THETA0))
      .scale(root / (ROOT * TIP))
      .translate(-CX, -CY),
  );
  const c = { all, outer, R, th0: UC * step, pitch: (2 * Math.PI) / n };
  made.set(key, c);
  return c;
}
/** a cog's path on the picture: centre (x, y), turned by rot (radians) */
export function cogPath(c: Cog, x: number, y: number, rot = 0, which: "all" | "outer" = "all"): Path2D {
  const p = new Path2D();
  p.addPath(c[which], new DOMMatrix().translate(x, y).rotate(deg(rot)));
  return p;
}
export function cogFill(g: G, c: Cog, x: number, y: number, rot: number, color: string, a = 1): void {
  g.save();
  g.globalAlpha *= a;
  g.fillStyle = color;
  g.fill(cogPath(c, x, y, rot));
  g.restore();
}
export function cogLine(g: G, c: Cog, x: number, y: number, rot: number, color: string, a: number): void {
  g.save();
  g.globalAlpha *= a;
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.lineJoin = "round";
  g.stroke(cogPath(c, x, y, rot));
  g.restore();
}
/** the turn that points a tooth of c in direction th */
export const toothAt = (c: Cog, th: number): number => th - c.th0;
/** the turn of cog b, sitting in direction th from cog a (turned by rotA), so that where they meet a tooth of one stands in a gap
 *  of the other */
export function meshRot(a: Cog, rotA: number, b: Cog, th: number): number {
  const f = (th - rotA - a.th0) / a.pitch;
  return th + Math.PI - b.th0 - (0.5 - (f - Math.floor(f))) * b.pitch;
}
