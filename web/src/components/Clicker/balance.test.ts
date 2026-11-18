// The clicker's pace (docs-local/clicker-iteration-2.md, item 20; iteration-3, items 8, 9 and 17): two players played through
// step() and slips() at ten steps a second: the longest wait between two unlocks, the longest with nothing to buy early on, the
// first handover, and how fast the wheel turns at each stage.
import { expect, it } from "vitest";
import {
  buyCom,
  buyFam,
  buyGrip,
  buyOil,
  buyProj,
  buySpin,
  canCharter,
  CHARTER,
  charter,
  charterPrice,
  comPrice,
  FAM,
  famPrice,
  flipCom,
  free,
  fresh,
  glide,
  gripPrice,
  HAND_AT,
  helped,
  idle,
  kick,
  layer,
  OIL_MAX,
  oilPrice,
  PROJ,
  projPrice,
  rank,
  recruit,
  recruitPrice,
  SHOW,
  SPIN,
  shownCards,
  shownFam,
  shownProj,
  slips,
  social,
  socialPrice,
  startRun,
  step,
  type Game,
} from "./game";

/** what the player has seen so far: the cards and projects shown, the stage (and with it the tabs), the role, the clubs
 * chartered (one more of any is an unlock) */
const seen = (g: Game): number => shownCards(g) + shownProj(g) + g.stage + rank(g) + g.chart;
/** a fixed series of rolls for the slips, so that the games are the same every time */
let seed = 7;
const roll = (): number => {
  seed = (seed * 16_807) % 2_147_483_647;
  return seed / 2_147_483_647;
};

type Buy = [number, (g: Game) => Game];
/** the cheapest thing there is to buy, as [price, buy] */
function cheapest(g: Game): Buy {
  const spin = g.spin === 0 && g.all >= SHOW.swipe ? SPIN[1][1] : Infinity;
  const buys: Buy[] = [
    [gripPrice(g), buyGrip],
    [g.oil < OIL_MAX && g.all >= SHOW.oil ? oilPrice(g) : Infinity, buyOil],
    [g.spin === 1 && g.all >= SHOW.hold ? SPIN[2][1] : spin, buySpin],
    [g.mem > 0 ? recruitPrice(g) : Infinity, recruit],
    ...FAM.map((_, i): Buy => [i < shownFam(g) ? famPrice(g, i) : Infinity, (x) => buyFam(x, i)]),
    ...PROJ.map((_, i): Buy => [i < shownProj(g) ? projPrice(g, i) : Infinity, (x) => buyProj(x, i)]),
    ...PROJ.map(
      (_, i): Buy => [g.own[i] && !g.com[i] && free(g) >= PROJ[i]!.crew ? comPrice(i) : Infinity, (x) => buyCom(x, i)],
    ),
  ];
  return buys.sort((a, b) => a[0] - b[0])[0]!;
}
/** a club chartered, with committees switched off from the last one up for as long as it takes to free its members */
function charterFreeing(g: Game): Game {
  let x = g;
  for (let i = PROJ.length - 1; i >= 0 && !canCharter(x); i--) if (x.com[i] && !x.off[i]) x = flipCom(x, i);
  return canCharter(x) ? { ...charter(x), off: g.off } : g;
}
/** what the player does every half second: a social when the club is tired (nothing else until it can pay for one), every project run by hand it can; then it buys a
 * family wheel's first level (or the Districts wheel's next, once its clubs are all chartered) and a charter first, waits
 * for them while they cost less than `save`, else buys the cheapest thing there is */
function act(g0: Game, save: number): Game {
  let g = g0.en < 0.4 ? social(g0) : g0;
  // a tired club: save for the social first
  if (g.mem > 0 && g.en < 0.4) return g;
  for (let i = 0; i < PROJ.length; i++) g = startRun(g, i);
  const capped = g.fam[6]! > 0 && g.chart >= CHARTER.per * g.fam[6]!;
  const firsts = FAM.map((_, i) => i).filter((i) => i < shownFam(g) && (!g.fam[i] || (i === 6 && capped)));
  const first = firsts.find((i) => g.h >= famPrice(g, i));
  if (first !== undefined) return buyFam(g, first);
  if (!capped && g.fam[6]! > 0 && g.h >= charterPrice(g)) {
    const x = charterFreeing(g);
    if (x !== g) return x;
  }
  const want = [...firsts.map((i) => famPrice(g, i)), canCharter(g) ? charterPrice(g) : Infinity];
  if (want.some((p) => p <= save)) return g;
  const [price, buy] = cheapest(g);
  return g.h >= price ? buy(g) : g;
}
/** the wheel's speed after dt seconds: tapped 4 times a second, then swiped at its top speed, then held */
function hand(g: Game, w: number, k: number, dt: number): number {
  const top = SPIN[g.spin]![0];
  const rest = idle(g);
  if (g.spin === 2) return Math.max(Math.min(Math.max(top, rest), w + dt), rest);
  if (g.spin === 1) return Math.max(top, rest);
  const v = rest + (w - rest) * Math.exp(-dt / glide(g));
  return k % 2.5 < 1 ? Math.max(v, Math.min(top, Math.max(v, 0) + kick(g))) : v;
}
/** how a game went: the minutes of each unlock and of the first handover possible, the longest wait in seconds with nothing
 * to buy in the first 10 and 15 minutes and the seconds until the first thing to buy, and the wheel's top speed through the
 * exchange (stage 6), before the Country layer, and in all */
interface Played {
  at: number[];
  handover: number;
  broke: [number, number];
  first: number;
  fast: [number, number, number];
}
/** the wheel's top speeds so far (Played.fast) with its speed w now */
function speeds(fast: Played["fast"], g: Game, w: number): void {
  if (g.stage <= 6) fast[0] = Math.max(fast[0], w);
  if (layer(g) < 2) fast[1] = Math.max(fast[1], w);
  fast[2] = Math.max(fast[2], w);
}
/** the longest waits with nothing to buy (Played.broke) with the wait `wait` at second t, and the first thing to buy */
function waits(p: Played, wait: number, t: number): void {
  if (t < 600) p.broke[0] = Math.max(p.broke[0], wait);
  if (t < 900) p.broke[1] = Math.max(p.broke[1], wait);
  if (!wait && p.first === Infinity) p.first = t;
}
/** whether there is nothing to buy: not the cheapest thing, nor a social while the club is tired */
const nothing = (g: Game): boolean => g.h < Math.min(cheapest(g)[0], g.mem > 0 && g.en < 1 ? socialPrice(g) : Infinity);
/** `minutes` of play from g by a player who saves up `save` seconds of income for a first level or a charter (0: never saves) */
function play(minutes: number, save: number, g0 = fresh(0)): Played {
  let g = g0;
  let w = 0;
  let rate = 0;
  let was = seen(g);
  let wait = 0;
  const p: Played = { at: [], handover: Infinity, broke: [0, 0], first: Infinity, fast: [0, 0, 0] };
  const dt = 0.1;
  for (let k = 0; k * dt < minutes * 60; k++) {
    w = hand(g, w, k, dt);
    speeds(p.fast, g, w);
    const before = g.all;
    const rolls = FAM.map(roll);
    g = slips(step(g, dt, w * dt, w, false, w * dt), dt, rolls);
    rate += ((g.all - before) / dt - rate) * 0.01;
    // nothing to buy (a social counts while the club is tired), measured before the player buys
    wait = nothing(g) ? wait + dt : 0;
    waits(p, wait, k * dt);
    if (k % 5 === 0) g = act(g, rate * save);
    if (seen(g) > was) p.at.push((k * dt) / 60);
    was = seen(g);
    if (p.handover === Infinity && g.stage >= 8 && helped(g) >= HAND_AT) p.handover = (k * dt) / 60;
  }
  return p;
}
/** the longest wait between unlocks from minute `from` to `to` */
const gap = (at: number[], from: number, to: number): number => {
  const xs = [from, ...at.filter((m) => m > from && m < to), to];
  return Math.max(...xs.slice(1).map((m, i) => m - xs[i]!));
};

it.each([
  ["always buys the cheapest", 0, 50],
  ["saves up to two minutes for the next wheel or club", 120, 75],
])(
  "a player who %s sees something new every 2 min for 15 min, every 3 after, and may hand over after 40 min",
  (_, save, by) => {
    const { at, handover, broke, fast } = play(by, save);
    // the brief's 1–2 min, with 15 s of slack: the bots' longest gap moves by seconds with any price
    expect(gap(at, 0, 15)).toBeLessThanOrEqual(2.25);
    expect(gap(at, 15, Math.min(handover, by))).toBeLessThanOrEqual(3);
    expect(handover).toBeGreaterThan(40);
    expect(handover).toBeLessThan(by);
    // something to buy almost always early on: never 20 s without in the first 10 minutes
    expect(broke[0]).toBeLessThan(20);
    expect(broke[1]).toBeLessThan(20);
    // the wheel stays readable through the exchange, gets fast around the district, a blur only from the Country layer
    expect(fast[0]).toBeLessThanOrEqual(1);
    expect(fast[1]).toBeGreaterThanOrEqual(2);
    expect(fast[1]).toBeLessThanOrEqual(3.5);
    expect(fast[2]).toBeGreaterThanOrEqual(5);
  },
);

it("leaves something to buy within seconds for the player who found nothing (iteration 3, item 9)", () => {
  // 200 ms earned, Handshake 12, Momentum 8, Interact 2, the projects just come, nothing left in hand, tapping only
  const g = {
    ...fresh(0),
    all: 0.2,
    grip: 12,
    oil: 8,
    stage: 4,
    mem: 6,
    fam: [2, 0, 0, 0, 0, 0, 0],
    fm: [4, 0, 0, 0, 0, 0, 0],
  };
  expect(play(0.5, 0, g).first).toBeLessThan(3);
});
