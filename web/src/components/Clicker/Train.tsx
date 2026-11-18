// The Rotary family as a gear train round our wheel: each wheel a cog in its colour with its logo (the app's, static/img/fam),
// meshed where it belongs (MESH: youth to the left, the Rotary side to the right), sized by its members and turned against the
// one it meshes with at the ratio of their cogs. Members travel along the meshes as a "+1 🙋" (PIPE), and a wheel too strong
// for the one it drives slips now and then: a jolt, sparks and a clack. The whole train is scaled to fit the stage.
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { tx } from "../../i18n";
import { FAM, type Game, MESH, PIPE } from "./game";
import { play } from "./sound";

/** the family's wheels as drawn: colour, logo (cut: only its right end, the wheel, shows; Rotex's cut to its wheel and name) or an emoji where the app has none,
 * and which of tx("fam") names them (Rotex alone for the fourth, whose full name is long) */
const LOOK = [
  { color: "#00a2e0", logo: "img/fam/interact.png", cut: true, name: 2 },
  { color: "#ff7600", logo: "img/fam/ryla.png", name: 4 },
  { color: "#f7a81b", logo: "img/fam/innerwheel.png", name: 5 },
  { color: "#009999", logo: "img/fam/rotex.svg#svgView(viewBox(712,36,392,160))", name: -1 },
  { color: "#17458f", logo: "img/fam/rotary.svg", cut: true, name: 0 },
  { color: "#872175", icon: "🌍", name: 6 },
  { color: "#6c7a89", icon: "🗺️", name: 7 },
];
export const famName = (i: number): string => tx("fam")[LOOK[i]!.name]?.[0] ?? "Rotex";
/** the stage is 300 units wide; our wheel (40 % of it) has 24 cogs on a pitch radius of R0, and every cog of the family is as
 * big as ours, so a wheel's radius goes with its cogs */
const R0 = 57;
const pct = (units: number): string => `${units / 3}%`;
/** the cogs of a family wheel with m members: 7, more as they double, 16 at most (ours has 24) */
export const teeth = (m: number): number => Math.min(7 + Math.floor(1.2 * Math.log2(1 + Math.max(m, 0))), 16);
/** where each family wheel sits from the one it meshes with (MESH), in degrees (0 right, 90 down): Interact left of ours, RYLA
 * up left of Interact, Inner Wheel up right of Rotary, Rotex down left of ours, Rotary right of it, the Foundation down right
 * of Rotary, the Districts right of it */
const DIR = [180, -115, -80, 115, 0, 80, 0];
/** a wheel of the train: family wheel i, its middle (units from ours), pitch radius, cogs, rotation (degrees), and whether it
 * is only a ghost (no level yet, drawn because a wheel with one meshes with it) */
export interface Gear {
  i: number;
  x: number;
  y: number;
  r: number;
  t: number;
  rot: number;
  ghost: boolean;
}
/** the family wheels drawn: those with a level, and those they mesh with on the way to ours (MESH's partners all mesh with
 * ours, so one pass does) */
export function drawn(fam: number[]): boolean[] {
  const on = fam.map((n) => n > 0);
  fam.forEach((n, i) => {
    const p = MESH[i] ?? -1;
    if (n > 0 && p >= 0) on[p] = true;
  });
  return on;
}
/** the train for levels `fam`, members `fm` and our wheel at `a` turns: each drawn wheel placed against the one it meshes with
 * (ours at 0, 0), turned the other way at the ratio of their cogs with a gap facing the other's cog */
export function train(fam: number[], fm: number[], a: number): Gear[] {
  const on = drawn(fam);
  const at: Gear[] = [];
  const ours = { x: 0, y: 0, r: R0, t: 24, rot: a * 360 };
  const place = (i: number): Gear => {
    const done = at[i];
    if (done) return done;
    const p = MESH[i] ?? -1;
    const from = p < 0 ? ours : place(p);
    // never bigger than the wheel it meshes with (unless that is ours), so the ones round Rotary keep clear of each other
    const t = Math.min(teeth(fm[i] ?? 0), p < 0 ? 24 : from.t);
    const r = (R0 * t) / 24;
    const dir = DIR[i]!;
    const rad = (dir * Math.PI) / 180;
    const gear = {
      i,
      x: from.x + (from.r + r) * Math.cos(rad),
      y: from.y + (from.r + r) * Math.sin(rad),
      r,
      t,
      rot: dir + 180 + 180 / t - ((from.rot - dir) * from.t) / t,
      ghost: !fam[i],
    };
    at[i] = gear;
    return gear;
  };
  return FAM.flatMap((_, i) => (on[i] ? [place(i)] : []));
}
/** the scale (at most 1) that fits the train into the stage with a margin, and its middle (units from ours) */
export function fit(gears: Gear[]): { s: number; x: number; y: number } {
  const e = R0 + 3.5;
  const box = gears.reduce(
    (b, g) => ({
      x0: Math.min(b.x0, g.x - g.r - 3.5),
      x1: Math.max(b.x1, g.x + g.r + 3.5),
      y0: Math.min(b.y0, g.y - g.r - 3.5),
      y1: Math.max(b.y1, g.y + g.r + 3.5),
    }),
    { x0: -e, x1: e, y0: -e, y1: e },
  );
  const s = Math.min(1, 288 / (box.x1 - box.x0), 288 / (box.y1 - box.y0));
  return { s, x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 };
}
/** the train in the stage: its scale (fit, `most` at the most) and where our wheel's middle is drawn (units from the stage's) */
export function placed(gears: Gear[], most: number): { s: number; x: number; y: number } {
  const f = fit(gears);
  const s = Math.min(most, f.s);
  return { s, x: -s * f.x, y: -s * f.y };
}
/** the stage's corners Rotex's bell may sit in (top right, top left, bottom right, bottom left), as signs */
const CORNERS = [
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
] as const;
/** how far the bell's middle sits from the stage's middle, across and down (units: 28 px in from a 290 px stage's corner) */
export const DOCK = 121;
/** the bell's dock: the corner (of CORNERS) farthest clear of the train's wheels, ours included, and that room (units between
 * the bell's middle and the nearest cog's edge); the first of equals */
export function dock(gears: Gear[], most: number): [number, number] {
  const at = placed(gears, most);
  const wheels = [{ x: 0, y: 0, r: R0 }, ...gears.map((g) => ({ x: g.x, y: g.y, r: g.r }))];
  const room = ([sx, sy]: readonly [number, number]) =>
    Math.min(
      ...wheels.map(
        (w) => Math.hypot(at.x + at.s * w.x - sx * DOCK, at.y + at.s * w.y - sy * DOCK) - at.s * (w.r + 3.5),
      ),
    );
  return CORNERS.reduce<[number, number]>(
    (b, c, k) => {
      const r = room(c);
      return r > b[1] ? [k, r] : b;
    },
    [0, Number.NEGATIVE_INFINITY],
  );
}
/** a cogwheel around 0,0 with n cogs and pitch radius r, as an SVG path */
function cogPath(n: number, r: number): string {
  const pt = (rad: number, a: number) => `${(rad * Math.cos(a)).toFixed(1)},${(rad * Math.sin(a)).toFixed(1)}`;
  const step = (2 * Math.PI) / n;
  let d = "";
  for (let k = 0; k < n; k++) {
    const a = k * step;
    d += `${k ? "L" : "M"}${pt(r - 3.5, a - 0.3 * step)}L${pt(r + 3.5, a - 0.15 * step)}L${pt(r + 3.5, a + 0.15 * step)}L${pt(r - 3.5, a + 0.3 * step)}`;
  }
  return `${d}Z`;
}
/** family wheel i's logo, or its emoji */
function Logo({ i }: { i: number }) {
  const { logo, cut, icon } = LOOK[i]!;
  return logo ? <img className={cut ? "cut" : undefined} src={logo} alt="" draggable={false} /> : <span>{icon}</span>;
}
/** a cog of t cogs in colour `color`, its white hub (hub: the hub's share of the radius) */
function CogSvg({
  t,
  color,
  hub,
  className,
  style,
}: {
  t: number;
  color: string;
  hub: number;
  className?: string;
  style?: CSSProperties;
}) {
  const r = (R0 * t) / 24;
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox={`${-r - 3.5} ${-r - 3.5} ${2 * r + 7} ${2 * r + 7}`}
      style={{ ...style, color }}
    >
      <path d={cogPath(t, r)} fill="currentColor" />
      <circle r={r * hub} />
    </svg>
  );
}
/** family wheel i as a small cog in its colour with its logo in the middle, for its card */
export function CogIcon({ i }: { i: number }) {
  return (
    <span className="cog-card">
      <CogSvg t={10} color={LOOK[i]!.color} hub={0.66} />
      <Logo i={i} />
    </span>
  );
}
/** a wheel of the train: the cog turning, and over it (not turning) its logo, its name on hover and its members */
function Cog({ gear, n, slip }: { gear: Gear; n: number; slip: boolean }) {
  const { i, x, y, r, t, rot, ghost } = gear;
  const pos: CSSProperties = { left: pct(150 + x), top: pct(150 + y), width: pct(2 * (r + 3.5)) };
  const cls = `${ghost ? " ghost" : ""}${slip ? " slip" : ""}`;
  return (
    <>
      <CogSvg className={`cog${cls}`} t={t} color={LOOK[i]!.color} hub={0.62} style={{ ...pos, rotate: `${rot}deg` }} />
      <span className={`cog-i${cls}`} style={pos} title={famName(i)} aria-hidden="true">
        <Logo i={i} />
        {!ghost && <small>👥 {Math.floor(n)}</small>}
      </span>
    </>
  );
}
let tokenId = 0;
/** a "+1 🙋" for every whole member moved along a mesh of the PIPE since the last render (none after a new start); and a way to
 * drop one once it arrived */
function useTokens(moved: number[]): [{ id: number; e: number }[], (id: number) => void] {
  const [tokens, setTokens] = useState<{ id: number; e: number }[]>([]);
  const key = moved.map(Math.floor).join();
  const was = useRef(key);
  useEffect(() => {
    const before = was.current.split(",").map(Number);
    was.current = key;
    const more = key
      .split(",")
      .map(Number)
      .flatMap((n, e) => (n > (before[e] ?? n) ? [{ id: ++tokenId, e }] : []));
    if (more.length) setTokens((t) => [...t.slice(-5), ...more]);
  }, [key]);
  return [tokens, (id) => setTokens((t) => t.filter((o) => o.id !== id))];
}
let sparkId = 0;
/** sparks where a wheel starts to slip, with a clack (if the sounds are on); and a way to drop them once they faded */
function useSparks(slip: number[], sfx: boolean): [{ id: number; i: number }[], (id: number) => void] {
  const [sparks, setSparks] = useState<{ id: number; i: number }[]>([]);
  const key = slip.map((t) => +(t > 0)).join("");
  const was = useRef(key);
  useEffect(() => {
    const before = was.current;
    was.current = key;
    const more = [...key].flatMap((c, i) => (c === "1" && before[i] !== "1" ? [{ id: ++sparkId, i }] : []));
    if (!more.length) return;
    if (sfx) play("clack");
    setSparks((s) => [...s.slice(-3), ...more]);
  }, [key, sfx]);
  return [sparks, (id) => setSparks((s) => s.filter((o) => o.id !== id))];
}
/** where a wheel is (ours at 0, 0) */
const spot = (gears: Gear[], i: number): Gear | { x: number; y: number; r: number } | undefined =>
  i < 0 ? { x: 0, y: 0, r: R0 } : gears.find((x) => x.i === i);
const units = (x: number, y: number, k: string): CSSProperties =>
  ({ [`--x${k}`]: pct(150 + x), [`--y${k}`]: pct(150 + y) }) as CSSProperties;
/** the family's gear train round our wheel (children), at our wheel's `a` turns, scaled to fit the stage and `most` at the most
 * (the two never multiply: a train that needs to shrink to fit is not shrunk again) */
export function Train({ g, a, most, children }: { g: Game; a: number; most: number; children: ReactNode }) {
  const gears = train(g.fam, g.fm, a);
  const at = placed(gears, most);
  const [tokens, dropToken] = useTokens(g.moved);
  const [sparks, dropSpark] = useSparks(g.slip, g.sfx);
  return (
    <div className="train" style={{ scale: at.s, translate: `${pct(at.x)} ${pct(at.y)}` }}>
      {gears.map((x) => (
        <Cog key={x.i} gear={x} n={g.fm[x.i] ?? 0} slip={(g.slip[x.i] ?? 0) > 0} />
      ))}
      {children}
      {tokens.map(({ id, e }) => {
        const [from, to] = PIPE[e]!;
        const p = spot(gears, from);
        const q = spot(gears, to);
        return p && q ? (
          <span
            key={id}
            className="token"
            aria-hidden="true"
            style={{ ...units(p.x, p.y, "0"), ...units(q.x, q.y, "1") }}
            onAnimationEnd={() => dropToken(id)}
          >
            +1 🙋
          </span>
        ) : null;
      })}
      {sparks.map(({ id, i }) => {
        const p = spot(gears, MESH[i] ?? -1);
        const q = spot(gears, i);
        if (!p || !q) return null;
        // where the two mesh
        const k = p.r / (p.r + q.r);
        return (
          <span
            key={id}
            className="slip-spark"
            aria-hidden="true"
            style={units(p.x + (q.x - p.x) * k, p.y + (q.y - p.y) * k, "")}
            onAnimationEnd={() => dropSpark(id)}
          >
            <i />
            <i />
            <i />
            <i />
          </span>
        );
      })}
    </div>
  );
}
