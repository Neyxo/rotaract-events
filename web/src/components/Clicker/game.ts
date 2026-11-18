// The idle clicker's state and its sums, all pure: the component (Clicker.tsx) only wires them. Service time, the one currency,
// is counted in seconds everywhere (g.h, g.all, prices) and told with fmt() (./text), from nanoseconds (the first taps) to years.
// Balance (./balance.test.ts: a bot that taps ~4 a second, swipes, holds and buys the cheapest thing by the level, and one that
// saves for the next wheel or club), the first bot's timeline (minutes): Momentum 0:16, Swipe 0:53, the club 1:03, Interact and
// the family 1:32, the projects and Board 2:04, RYLA 2:11, Hold 2:29, Inner Wheel 3:23, the Avenues and President 4:31, Rotex
// 5:07, Rotary 6:56, the Foundation 7:50, the Districts 10:38, the exchange 14:10, the district 18:30, the first club chartered
// and the Year 20:23, DRR 23:24, Governor 30:44, a handover possible ~46 (the saver ~70); a project every 1-3 min in between.
// So something new every 2 min for 15 min, every 3 after, and never 20 s with nothing to buy in the first 10 (some 3 s at most:
// Handshake's levels are cheap and many). The wheel, as drawn (turns a second): a creep by hand, one (Hold) through the
// exchange (1.0 at 5, 10, 20 min), 2 around the district (2.1 at 25), 3 at 30, IDLE_MAX only from the Country layer (6 at 35,
// 40, 50): income grows from what a turn brings, not from the speed.
import type { StoreKeys } from "../../lib/store";
import type { Event } from "../../lib/types";

export type Game = StoreKeys["rac.clicker"];
/** how the wheel is spun: a tap, then a swipe, then holding it down; [fastest turns per second by hand, price] */
export const SPIN = [
  [0.5, 0],
  [0.8, 4e-4],
  [1, 50],
] as const;
/** the service time earned this year at which a thing shows: Momentum, Swipe, the club, Hold */
export const SHOW = { oil: 2e-5, swipe: 2e-4, club: 3e-4, hold: 25 };
/** what a turn of the bare wheel earns (seconds): ten microseconds, so the first taps earn a few hundred nanoseconds */
export const TURN = 1e-5;
/** the turns a second a tap pushes the wheel by (it creeps), a little more with every level of Handshake */
export const KICK = 0.12;
/** the members a club is founded with; they never move on to Rotary, so only leaving can fold it */
const FOUNDERS = 3;
/** the energy under which members leave */
export const LOW = 0.2;
/** the club's tiredness a second: BASE per doubling of its members, BURN per turn a second spun over what it keeps up with */
export const BASE = 0.0006;
export const BURN = 0.002;
/** the most levels of Momentum */
export const OIL_MAX = 60;
/** the levels of an upgrade (Handshake, Momentum, a family wheel) at which its effect doubles */
export const UP_MILES = [10, 25, 50, 100];
/** how many times an upgrade's effect is doubled at n levels: twice per milestone reached */
export const twice = (n: number): number => 2 ** UP_MILES.filter((m) => n >= m).length;
/** the milestone after n levels, if any */
export const nextMile = (n: number): number | undefined => UP_MILES.find((m) => m > n);
/** what k levels cost from price p (the next one's), each r times the one before: a geometric series */
export const series = (p: number, r: number, k: number): number => (k > 0 ? (p * (r ** k - 1)) / (r - 1) : 0);
/** how many levels h buys from price p (the next one's), each r times the one before */
export function affordable(p: number, r: number, h: number): number {
  if (h < p) return 0;
  let k = Math.floor(Math.log(1 + (h * (r - 1)) / p) / Math.log(r));
  // rounding: the series may land a hair either side of h
  while (k > 0 && series(p, r, k) > h) k--;
  return series(p, r, k + 1) <= h ? k + 1 : k;
}
/** the members at which the projects (stage 4) and the Avenues (stage 5) come */
export const GATE = { proj: 6, av: 12 };
const DAY = 86_400;
const YEAR = 365 * DAY;
/** the projects, AdCap-style: first price, what a run brings per one owned, its seconds, the members it needs (crew), the
 * energy a run costs the club */
export const PROJ = [
  { price: 3, brings: 0.4, secs: 3, crew: 1, en: 0.003 },
  { price: 240, brings: 50, secs: 8, crew: 2, en: 0.006 },
  { price: 5000, brings: 1600, secs: 20, crew: 3, en: 0.009 },
  { price: 10 * 3600, brings: 13 * 3600, secs: 45, crew: 4, en: 0.012 },
  { price: 6 * DAY, brings: 8 * DAY, secs: 90, crew: 6, en: 0.015 },
  { price: 40 * DAY, brings: 80 * DAY, secs: 180, crew: 8, en: 0.018 },
  { price: 0.25 * YEAR, brings: 0.6 * YEAR, secs: 360, crew: 12, en: 0.021 },
  { price: 0.8 * YEAR, brings: 1.8 * YEAR, secs: 720, crew: 16, en: 0.024 },
];
/** the numbers owned at which a project's runs go twice as fast */
export const MILES = [10, 25, 50, 100, 200];
/** the Avenues of Service, in order (Club, Vocational, Community, International, Youth): each attracts its own kind of member
 * (Socials, Professionals, Doers, Globetrotters, Mentors); the share of a kind among the members is what it does */
export const AVENUES = 5;
/** the most Avenue points there are */
const PTS_MAX = 15;
/** a real event's run: its crew, its seconds, and how many of the best project's runs it pays */
export const EVENT = { crew: 2, secs: 30, times: 50, days: 14 };
/** the service time earned this year at which the Rotary family and the Upgrades tab come (stage 3) */
export const FAM_AT = 0.03;
/** the wheels of the Rotary family, in order (Interact, RYLA, Inner Wheel, Rotex, Rotary, Foundation, Districts): their first
 * price, each shown at half of it, so that a new one comes every few minutes; each level is FAM_UP times the last, adds FAM_TURN
 * to a turn and turns our wheel a little by itself */
export const FAM = [0.05, 10, 700, 13_000, 26 * 3600, 2.5 * DAY, 16 * DAY];
/** what every level of any family wheel adds to a turn, the turns a second it turns ours by itself, and the most turns a second
 * the wheel turns by itself */
export const FAM_UP = 2.8;
export const FAM_TURN = 0.13;
export const FAM_IDLE = 0.01;
export const IDLE_MAX = 6;
/** the wheel each family wheel meshes with on its way to ours (-1 ours), the one it drives: Interact and Rotex ours, RYLA
 * Interact, Rotary ours, Inner Wheel, the Foundation and the Districts Rotary */
export const MESH = [-1, 0, 4, -1, -1, 4, 4];
/** the family's members: FLOW.give with every level bought, FLOW.join a second per level by themselves; Interact's graduate into
 * our club (FLOW.grad a second per level), ours move on to Rotary, Rotary's feed Inner Wheel and the Foundation (FLOW.feed of
 * them a second, each); a wheel's own join stops at FLOW.cap members per level, so ours stays the hub */
export const FLOW = { give: 2, join: 0.01, cap: 8, grad: 0.003, feed: 1 / 600 };
/** the meshes members flow along, [from, to] (-1 ours): Interact to ours, ours to Rotary, Rotary to Inner Wheel and the
 * Foundation */
export const PIPE = [
  [0, -1],
  [-1, 4],
  [4, 2],
  [4, 5],
] as const;
/** a wheel too strong for the one it drives (more than twice its levels and 3 more) skips teeth about every SLIP.every
 * seconds and loses its pull on ours for SLIP.secs */
export const SLIP = { every: 8, secs: 1.2 };
/** a guest speaker's talk: its seconds, and how long the bell rings before it goes */
export const TALK = { secs: 45, bell: 9 };
/** the service time earned this year at which the exchange opens (stage 6), if the Foundation wheel did not open it first */
export const EX_AT = 120 * DAY;
/** the exchange: how often its prices move (seconds), how much they rise a minute, and each club's swings a move, safe to wild */
export const MARKET = { tick: 2, drift: 0.002, vol: [0.01, 0.025, 0.04, 0.06, 0.08], keep: 30 };
/** the Foundation: how long a deposit is away (seconds), and how many may be at once */
export const FUND = { secs: 120, most: 3 };
/** a chartered club: its first price (`up` times that for every one before it), the members it takes, how many per level of the
 * Districts wheel, and how much of the family's turning it adds (times its layer's reach) */
export const CHARTER = { price: 0.08 * YEAR, up: 1.3, crew: 3, per: 8, turns: 0.05 };
/** the layers (Club, District, Country, International): the chartered clubs each begins at, and its reach */
export const LAYER = { at: [0, 3, 10, 30], reach: [1, 2, 4, 8] };
/** the District conference: the turns to make in its seconds, the seconds time is doubled after it, and its cooldown */
export const CONF = { turns: 100, secs: 60, boost: 300, cool: 600 };
/** the people helped at which a handover is possible */
export const HAND_AT = 50;
/** what helpers buy for good (Experience, Treasurer, Vice-president, Mentoring): the price of a level is `per` times the
 * level, up to `most` */
export const PERM = [
  { per: 10, most: 99 },
  { per: 20, most: 4 },
  { per: 200, most: 1 },
  { per: 50, most: 5 },
];
/** a year's culture (Bern, Zürich, Romandie, Ticino) and meeting rhythm (weekly, every two weeks), voted at the General
 * Assembly, as what they multiply: a run's seconds, the club's tiredness, a talk's seconds, a turn, members joining, a run's
 * payout, the family's turning */
const PLAIN = { dur: 1, drain: 1, talk: 1, turn: 1, join: 1, out: 1, idle: 1 };
export const CULT: Partial<typeof PLAIN>[] = [
  { dur: 1.1, drain: 0.7 },
  { dur: 0.8, drain: 1.3 },
  { talk: 2, turn: 0.9 },
  { join: 2, out: 0.9 },
];
export const RHYTHM: Partial<typeof PLAIN>[] = [
  { idle: 1.2, drain: 1.3 },
  { idle: 0.85, drain: 0.7 },
];
/** what a vote changes, as [field of PLAIN, change in whole percent]: { dur: 1.1, drain: 0.7 } is [["dur", 10], ["drain", -30]] */
export const effects = (m: Partial<typeof PLAIN>): [keyof typeof PLAIN, number][] =>
  Object.entries(m).map(([k, v]) => [k as keyof typeof PLAIN, Math.round((v - 1) * 100)]);

/** a year from zero: no hours, nothing bought, no club yet */
export const fresh = (now: number): Game => ({
  v: 10,
  h: 0,
  all: 0,
  at: now,
  grip: 0,
  oil: 0,
  spin: 0,
  mem: 0,
  en: 1,
  folded: false,
  stage: 1,
  own: PROJ.map(() => 0),
  run: PROJ.map(() => -1),
  com: PROJ.map(() => false),
  off: PROJ.map(() => false),
  soc: null,
  ev: null,
  evs: [],
  pts: Array(AVENUES).fill(0),
  kind: Array(AVENUES).fill(0),
  fam: FAM.map(() => 0),
  alum: 0,
  talk: null,
  px: MARKET.vol.map(() => [1]),
  sh: MARKET.vol.map(() => 0),
  paid: MARKET.vol.map(() => 0),
  peak: 0,
  dep: [],
  chart: 0,
  conf: null,
  cool: 0,
  boost: 0,
  years: 0,
  helpers: 0,
  perm: PERM.map(() => 0),
  ga: [-1, -1, -1, -1],
  sfx: true,
  music: true,
  bulk: 1,
  fm: FAM.map(() => 0),
  moved: PIPE.map(() => 0),
  slip: FAM.map(() => 0),
  runs: 0,
  top: 0,
});
const sum = (a: number[]): number => a.reduce((s, x) => s + x, 0);
/** how much more everything earned is: 1 % per mentor (members who moved on to Rotary) */
export const mentors = (g: Game): number => 1 + 0.01 * g.alum;
/** what the year's votes (culture, meeting rhythm) multiply, as PLAIN's fields */
export function law(g: Game): typeof PLAIN {
  const c = CULT[g.ga[0]!];
  const r = RHYTHM[g.ga[1]!];
  return { ...PLAIN, ...c, idle: r?.idle ?? 1, drain: (c?.drain ?? 1) * (r?.drain ?? 1) };
}
/** what multiplies everything earned: the mentors, 1 % per helper, and twice that after a District conference won */
export const gain = (g: Game): number => mentors(g) * (1 + 0.01 * g.helpers) * (g.boost > 0 ? 2 : 1);
/** the talk going on (0 time ×3 a turn, 1 projects twice as fast, 2 nobody gets tired), or -1 */
const talking = (g: Game): number => g.talk?.k ?? -1;
/** how big the wheel is: one alone, as many as the members once there is a club (members make it bigger, not faster) */
export const size = (g: Game): number => Math.max(heads(g), 1);
/** the seconds one turn earns: TURN, GRIP[2] times that per level of Handshake (twice at each of its milestones), by the wheel's
 * size, FAM_TURN more per level of any family wheel (twice at each of its milestones), up to twice with the members RYLA trained, a quarter more per level of Experience, by gain() and the culture, and
 * thrice that during the talk about time */
export const perTurn = (g: Game): number =>
  TURN *
  GRIP[2] ** g.grip *
  twice(g.grip) *
  size(g) *
  (1 + FAM_TURN * sum(g.fam.map((n) => n * twice(n)))) *
  (1 + trained(g)) *
  (1 + 0.25 * g.perm[0]!) *
  gain(g) *
  law(g).turn *
  (talking(g) === 0 ? 3 : 1);
/** the turns a second a tap pushes the wheel by: KICK, a hundredth more per level of Handshake */
export const kick = (g: Game): number => KICK * (1 + 0.01 * g.grip);
/** the share of the members RYLA trained: a tenth per level, all at most */
export const trained = (g: Game): number => Math.min(0.1 * g.fam[1]!, 1);
/** the seconds in which the wheel, let go, loses most of its speed: GLIDE at first (a badly oiled wheel stops almost at once),
 * 3 % longer per level of Momentum and twice as long at each of its milestones (some 7 s at the most) */
export const GLIDE = 0.15;
export const glide = (g: Game): number => GLIDE * 1.03 ** g.oil * twice(g.oil);
/** the members there are: one who is leaving counts until gone */
export const heads = (g: Game): number => Math.ceil(g.mem);
/** the layer reached by the chartered clubs: 0 Club, 1 District, 2 Country, 3 International */
export const layer = (g: Game): number => LAYER.at.findLastIndex((n) => g.chart >= n);
/** the turns per second the wheel turns by itself: only the family's wheels meshed with it turn it, FAM_IDLE per level times
 * the wheel's place in the family (the later wheels pull harder; one slipping not at all), by the meeting rhythm; every chartered club adds CHARTER.turns
 * of that, times its layer's reach; IDLE_MAX at most. Without them it turns by hand alone. So the wheel, as drawn, speeds up
 * slowly over the whole game: under a turn a second through the exchange, two or three around the district, a blur only at
 * the later layers. */
export const idle = (g: Game): number =>
  Math.min(
    FAM_IDLE *
      sum(g.fam.map((n, i) => ((g.slip[i] ?? 0) > 0 ? 0 : n * (i + 1)))) *
      law(g).idle *
      (1 + CHARTER.turns * g.chart * LAYER.reach[layer(g)]!),
    IDLE_MAX,
  );
/** the turns per second the club keeps up with: a tenth more per member, and always what it turns by itself; faster than
 * that tires it */
export const comfort = (g: Game): number => Math.max(1 + 0.1 * heads(g), idle(g));
/** Handshake's first price, how much dearer each level makes it, and how much more each level makes a turn earn: cheap levels,
 * small steps, many of them */
export const GRIP = [2e-6, 1.1, 1.05] as const;
export const gripPrice = (g: Game): number => GRIP[0] * GRIP[1] ** g.grip;
/** Momentum's first price and how much dearer each level makes it */
export const OIL = [1e-5, 1.5] as const;
export const oilPrice = (g: Game): number => OIL[0] * OIL[1] ** g.oil;
/** the share of the members of Avenue k's kind (0 to 1); the president's theme counts double */
export const share = (g: Game, k: number): number =>
  g.mem > 0 ? Math.min((g.kind[k]! / g.mem) * (g.ga[2] === k ? 2 : 1), 1) : 0;
/** how much of its energy the club's work costs: Socials halve it at most, trained members tire half as much, the culture and
 * rhythm change it, and during the talk about it nobody does */
export const drain = (g: Game): number =>
  talking(g) === 2 ? 0 : (1 - 0.5 * share(g, 0)) * (1 - trained(g) / 2) * law(g).drain;
/** an info evening's first price and how much dearer each member beyond the founders makes it */
export const RECRUIT = [0.02, 3] as const;
/** an info evening: dearer with every member beyond the founders, Mentors make it up to half as dear */
export const recruitPrice = (g: Game): number =>
  RECRUIT[0] * RECRUIT[1] ** Math.max(heads(g) - FOUNDERS, 0) * (1 - 0.5 * share(g, 4));
/** what a social gives back: half the energy, and up to 30 % more with Socials */
export const refill = (g: Game): number => 0.5 + 0.3 * share(g, 0);
/** the Avenue points there are: two, one per role above Member, and one per level of Mentoring */
export const points = (g: Game): number => Math.min(2 + Math.max(rank(g) - 1, 0) + g.perm[3]!, PTS_MAX);
/** the members at `mem`: those who leave or move on leave every kind alike, those who join take the kinds in proportion to the
 * Avenue points (none: plain), so the mix shifts slowly when the points move */
export function grow(g: Game, mem: number): Game {
  const all = sum(g.pts);
  const kind =
    mem < g.mem
      ? g.kind.map((k) => (g.mem > 0 ? (k * Math.max(mem, 0)) / g.mem : 0))
      : g.kind.map((k, i) => (all ? k + ((mem - g.mem) * g.pts[i]!) / all : k));
  return { ...g, mem, kind };
}
/** Avenue k's points at v, as far as the points go */
export function setPts(g: Game, k: number, v: number): Game {
  const most = ptsLeft(g) + g.pts[k]!;
  return { ...g, pts: g.pts.map((p, i) => (i === k ? Math.max(0, Math.min(Math.round(v), most)) : p)) };
}
/** the members by kind: the Avenues' kinds, then the plain ones */
export const mix = (g: Game): number[] => [...g.kind, Math.max(g.mem - sum(g.kind), 0)];
/** the Avenue points not given yet */
export const ptsLeft = (g: Game): number => points(g) - sum(g.pts);
/** the kind of each of n faces in the crowd, in proportion: 0–4 an Avenue's, AVENUES plain */
export function crowd(g: Game, n: number): number[] {
  const parts = mix(g);
  const all = sum(parts) || 1;
  return Array.from({ length: n }, (_, j) => {
    let at = ((j + 0.5) / n) * all;
    const k = parts.findIndex((p) => (at -= p) < 0);
    return k < 0 ? AVENUES : k;
  });
}
/** a social: what SOCIAL turns of the wheel earn (so it keeps up with the club as it grows) */
export const SOCIAL = 20;
export const socialPrice = (g: Game): number => SOCIAL * perTurn({ ...g, talk: null });
/** the Social committee (a one-time Club upgrade from the projects on): its price in socials, and the energy under which it
 * throws one by itself */
export const SOC_COM = { socials: 25, under: 0.4 };
export const socComPrice = (g: Game): number => SOC_COM.socials * socialPrice(g);
export const buySocCom = (g: Game): Game =>
  g.soc !== null || g.stage < 4 ? g : pay(g, socComPrice(g), (x) => ({ ...x, soc: true }));
/** the Social committee switched on or off (nothing before it is bought) */
export const flipSoc = (g: Game): Game => (g.soc === null ? g : { ...g, soc: !g.soc });
/** a social thrown by the Social committee, when it is on, the energy under SOC_COM.under and the time there */
const autoSocial = (g: Game): Game => (g.soc && g.en < SOC_COM.under ? social(g) : g);

/** how many times faster a project runs with n owned: twice per milestone reached */
export const speedUp = (n: number): number => 2 ** MILES.filter((m) => n >= m).length;
/** the seconds one run of project i takes: Professionals make it up to twice as fast, and so does the talk about it; by the
 * culture */
export const runTime = (g: Game, i: number): number =>
  (PROJ[i]!.secs * law(g).dur) / speedUp(g.own[i]!) / (1 + share(g, 1)) / (talking(g) === 1 ? 2 : 1);
/** what one run of project i brings: Doers make it up to twice as much, gain() more, by the culture */
export const perRun = (g: Game, i: number): number =>
  PROJ[i]!.brings * g.own[i]! * (1 + share(g, 2)) * gain(g) * law(g).out;
/** the next one of project i: 15 % dearer for every one owned */
export const PROJ_UP = 1.15;
export const projPrice = (g: Game, i: number): number => PROJ[i]!.price * PROJ_UP ** g.own[i]!;
/** a committee for project i: ten times its first price */
export const comPrice = (i: number): number => 10 * PROJ[i]!.price;
/** the projects shown: from stage 4 the first, and each other once half its first price was earned this year (in order) */
export const shownProj = (g: Game): number =>
  g.stage < 4 ? 0 : PROJ.filter((p, i) => !i || g.all >= p.price / 2).length;
/** which committees work: those not switched off (off), in order, as long as there are members enough for them besides those
 * on runs by hand and the real event; the last ones pause first. One switched off stands still and frees its crew. */
export function working(g: Game): boolean[] {
  let left = PROJ.reduce(
    (n, p, i) => n - (!g.com[i] && g.run[i]! >= 0 ? p.crew : 0),
    heads(g) - (g.ev ? EVENT.crew : 0),
  );
  let paused = false;
  return g.com.map((c, i) => {
    if (!c || g.off[i] || paused) return false;
    paused = PROJ[i]!.crew > left;
    left -= PROJ[i]!.crew;
    return !paused;
  });
}
/** the members not on a run by hand, the real event or a committee that works */
export function free(g: Game): number {
  const on = working(g);
  const busy = PROJ.reduce(
    (n, p, i) => n + (on[i] || (!g.com[i] && g.run[i]! >= 0) ? p.crew : 0),
    g.ev ? EVENT.crew : 0,
  );
  return Math.max(heads(g) - busy, 0);
}
/** what the best project owned brings a run: a real event pays EVENT.times that */
export const best = (g: Game): number => Math.max(0, ...PROJ.map((_, i) => perRun(g, i)));

/** g after `price` hours were paid for `then`, or g as it was if the hours do not reach */
const pay = (g: Game, price: number, then: (g: Game) => Game): Game =>
  g.h < price ? g : then({ ...g, h: g.h - price });
const set = <T>(a: T[], i: number, v: T): T[] => a.map((x, j) => (j === i ? v : x));
export const buyGrip = (g: Game): Game => buyLevels(g, "grip", 1);
export const buyOil = (g: Game): Game => buyLevels(g, "oil", 1);
export const buySpin = (g: Game): Game =>
  g.spin + 1 < SPIN.length ? pay(g, SPIN[g.spin + 1]![1], (x) => ({ ...x, spin: x.spin + 1 })) : g;
/** Hold, only once Swipe was bought (its card stands in its own place, Swipe's stays) */
export const buyHold = (g: Game): Game => (g.spin === 1 ? buySpin(g) : g);
export const recruit = (g: Game): Game =>
  g.mem <= 0 || g.folded ? g : pay(g, recruitPrice(g), (x) => grow(x, x.mem + 1));
export const social = (g: Game): Game =>
  g.mem <= 0 || g.folded || g.en >= 1
    ? g
    : pay(g, socialPrice(g), (x) => ({ ...x, en: Math.min(1, x.en + refill(x)) }));
/** one more of project i; with the Vice-president, the first one comes with a committee */
export const buyProj = (g: Game, i: number): Game => buyLevels(g, `proj${i}`, 1);
/** k more of project i; with the Vice-president, the first one comes with a committee */
function addProj(x: Game, i: number, k: number): Game {
  const vp = x.own[i] === 0 && x.perm[2]! > 0;
  return {
    ...x,
    own: set(x.own, i, x.own[i]! + k),
    com: vp ? set(x.com, i, true) : x.com,
    run: vp ? set(x.run, i, 0) : x.run,
  };
}
/** a run of project i by hand: one owned, no committee, not running already, and its crew free */
export const startRun = (g: Game, i: number): Game =>
  g.own[i]! > 0 && !g.com[i] && g.run[i]! < 0 && free(g) >= PROJ[i]!.crew ? { ...g, run: set(g.run, i, 0) } : g;
/** a committee for project i: its crew, free now, on it for good, and the project runs by itself from then on */
export const buyCom = (g: Game, i: number): Game =>
  g.own[i]! > 0 && !g.com[i] && free(g) >= PROJ[i]!.crew
    ? pay(g, comPrice(i), (x) => ({ ...x, com: set(x.com, i, true), run: set(x.run, i, Math.max(x.run[i]!, 0)) }))
    : g;
/** project i's committee switched off or on again (it costs the club energy) */
export const flipCom = (g: Game, i: number): Game => (g.com[i] ? { ...g, off: set(g.off, i, !g.off[i]) } : g);
/** the next level of family wheel i */
export const famPrice = (g: Game, i: number): number => FAM[i]! * FAM_UP ** g.fam[i]!;
/** the upgrade cards in the order they come, each with the service time earned this year at which it shows (the family's from
 * FAM_AT on): one after the other, so that a new one takes the place of the 🔒 card that announced it and none moves */
export const CARDS: readonly { id: string; at: number }[] = [
  { id: "grip", at: 0 },
  { id: "oil", at: SHOW.oil },
  { id: "swipe", at: SHOW.swipe },
  { id: "hold", at: SHOW.hold },
  ...FAM.map((p, i) => ({ id: `fam${i}`, at: Math.max(p / 2, FAM_AT) })),
].sort((a, b) => a.at - b.at);
/** how many of CARDS show: those reached, in order (the family's from stage 3) */
export const shownCards = (g: Game): number => {
  const n = CARDS.findIndex((c) => g.all < c.at || (c.id.startsWith("fam") && g.stage < 3));
  return n < 0 ? CARDS.length : n;
};
/** the family wheels shown: from stage 3, each once half its first price was earned this year (in order) */
export const shownFam = (g: Game): number => (g.stage < 3 ? 0 : FAM.filter((p) => g.all >= p / 2).length);
export const buyFam = (g: Game, i: number): Game => buyLevels(g, `fam${i}`, 1);

/** a thing bought by the level (Handshake "grip", Momentum "oil", family wheel i "fam" i, project i "proj" i): its first
 * price, how much dearer each level makes it, the levels bought, and the most there may be (as many as bought while not shown) */
export function line(g: Game, id: string): { p: number; r: number; n: number; most: number } {
  const i = Number(id.replace(/\D+/, "")) || 0;
  if (id.startsWith("proj")) return { p: PROJ[i]!.price, r: PROJ_UP, n: g.own[i]!, most: 1e9 };
  if (id.startsWith("fam")) return { p: FAM[i]!, r: FAM_UP, n: g.fam[i]!, most: i < shownFam(g) ? 1e9 : g.fam[i]! };
  if (id === "oil") return { p: OIL[0], r: OIL[1], n: g.oil, most: OIL_MAX };
  return { p: GRIP[0], r: GRIP[1], n: g.grip, most: 1e9 };
}
/** k levels of `id` added */
function raise(g: Game, id: string, k: number): Game {
  if (id === "grip") return { ...g, grip: g.grip + k };
  if (id === "oil") return { ...g, oil: g.oil + k };
  const i = Number(id.replace(/\D+/, "")) || 0;
  if (!id.startsWith("fam")) return addProj(g, i, k);
  return { ...g, fam: set(g.fam, i, g.fam[i]! + k), fm: set(g.fm, i, g.fm[i]! + FLOW.give * k) };
}
/** the levels of `id` the next buy takes, by the amount chosen (g.bulk: 1, 10, or 0 for as many as the time buys, at least
 * one), never beyond the most there may be */
export function amount(g: Game, id: string): number {
  const { p, r, n, most } = line(g, id);
  const k = g.bulk || Math.max(affordable(p * r ** n, r, g.h), 1);
  return Math.max(Math.min(k, most - n), 0);
}
/** what the next k levels of `id` cost (amount() by default) */
export function bulkPrice(g: Game, id: string, k = amount(g, id)): number {
  const { p, r, n } = line(g, id);
  return series(p * r ** n, r, k);
}
/** k levels of `id` bought (amount() by default), if there may be that many and the time reaches */
export function buyLevels(g: Game, id: string, k = amount(g, id)): Game {
  const { n, most } = line(g, id);
  return k > 0 && n + k <= most ? pay(g, bulkPrice(g, id, k), (x) => raise(x, id, k)) : g;
}
/** the amount bought at once next: 1, 10, or 0 for as many as the time buys */
export const setBulk = (g: Game, bulk: number): Game => ({ ...g, bulk });
/** the seconds between Rotex's bells on average: 60, less by half per level of Rotex, up to half that with Globetrotters
 * (never without Rotex) */
export const bellEvery = (g: Game): number =>
  g.fam[3]! > 0 ? 60 / ((1 + g.fam[3]! / 2) * (1 + share(g, 3))) : Number.POSITIVE_INFINITY;
/** whether the bell rings in a step of dt seconds, for a random roll (0 to 1): once every bellEvery() on average */
export const ring = (g: Game, dt: number, roll: number): boolean => roll < dt / bellEvery(g);
/** the seconds the bell keeps quiet after a talk was picked: the talk, then its usual wait */
export const bellQuiet = (g: Game): number => TALK.secs * law(g).talk + bellEvery(g);
/** whether ×1 / ×10 / ×Max matters yet: from stage 3 (the family), once chosen, or as soon as ten levels of a card shown are
 * affordable */
export const bulkShown = (g: Game): boolean =>
  g.stage >= 3 ||
  g.bulk !== 1 ||
  CARDS.slice(0, shownCards(g)).some(({ id }) => {
    const ten = { ...g, bulk: 10 };
    return (id === "grip" || id === "oil") && amount(ten, id) === 10 && bulkPrice(ten, id) <= g.h;
  });
/** the guest speaker's talk k (0 time ×3 a turn, 1 projects twice as fast, 2 nobody gets tired), for TALK.secs */
export const talk = (g: Game, k: number): Game => ({ ...g, talk: { k, t: TALK.secs * law(g).talk } });
/** a real event's run, once per event, with its crew free */
export const startEvent = (g: Game, id: string): Game =>
  !g.ev && !g.evs.includes(id) && free(g) >= EVENT.crew ? { ...g, ev: { id, t: 0 } } : g;

/** dt seconds of the projects: the runs move on and those that end pay out (a committee's start again at once, as often as
 * dt holds them), and every run tires the club by its energy (a milestone makes runs faster, not more tiring); a committee that
 * pauses stands still. The real event's run pays EVENT.times the best project's run at its end. */
export function work(g: Game, dt: number): Game {
  const on = working(g);
  let paid = 0;
  let tired = 0;
  let runs = 0;
  const run = g.run.map((t, i) => {
    if (t < 0 || (g.com[i] && !on[i])) return t;
    const len = runTime(g, i);
    const n = g.com[i] ? Math.floor((t + dt) / len) : +(t + dt >= len);
    paid += n * perRun(g, i);
    runs += n;
    tired += (n * PROJ[i]!.en * drain(g)) / speedUp(g.own[i]!);
    if (g.com[i]) return t + dt - n * len;
    return n ? -1 : t + dt;
  });
  const ev = g.ev && { ...g.ev, t: g.ev.t + dt };
  const done = ev && ev.t >= EVENT.secs;
  if (done) paid += EVENT.times * best(g);
  return {
    ...g,
    run,
    runs: g.runs + runs,
    h: g.h + paid,
    all: g.all + paid,
    en: Math.max(g.en - tired, 0),
    ev: done ? null : ev,
    evs: done ? [...g.evs, ev.id] : g.evs,
  };
}
/** the energy dt seconds later: down by BASE a second per doubling of the members, and by more while the wheel turns faster
 * than the club keeps up with (BURN per turn a second over), up by 0.002 a second per level of Inner Wheel but never by more
 * than four fifths of what it used, so an ignored club still folds; away, it stays at 0.3 (or where it was, `was`, if lower) */
function tire(x: Game, dt: number, speed: number, away: boolean, was: number): number {
  const used = dt * drain(x) * (BASE * Math.log2(1 + heads(x)) + BURN * Math.max(Math.abs(speed) - comfort(x), 0));
  const en = Math.min(x.en - used + Math.min(0.002 * x.fam[2]! * dt, 0.8 * used), 1);
  return Math.max(away ? Math.max(en, Math.min(was, 0.3)) : en, 0);
}
/** the stage reached: 1 the wheel, 2 the club (joined in step()), 3 the family (at FAM_AT earned), 4
 * projects (at GATE.proj members), 5 the Avenues (at GATE.av members), 6 the exchange (with the Foundation wheel or at EX_AT
 * earned), 7 the district (with the Districts wheel), 8 the year (with a club chartered); each only after the one before, and
 * never back down within a year */
export const stageOf = (g: Game): number =>
  Math.max(
    g.stage,
    g.stage >= 2 && g.all >= FAM_AT ? 3 : 0,
    g.stage >= 3 && heads(g) >= GATE.proj ? 4 : 0,
    g.stage >= 4 && heads(g) >= GATE.av ? 5 : 0,
    g.stage >= 5 && (g.fam[5]! > 0 || g.all >= EX_AT) ? 6 : 0,
    g.stage >= 6 && g.fam[6]! > 0 ? 7 : 0,
    g.stage >= 7 && g.chart > 0 ? 8 : 0,
  );
/** dt seconds later, the wheel `turns` turns further at `speed` turns a second: the hours of the turns, the club founded once
 * enough were earned, the projects' runs, and the club's work (tire()); under LOW members leave (a fifth of one a second when
 * it is empty), those beyond the founders move on to Rotary at one in 900 a second (with the Rotary wheel they become mentors),
 * Mentors bring in up to 0.02 a second and Interact 0.003 per level; the talk runs out. The last one gone, the club folds and
 * nothing moves any more. The Social committee throws a social when it is due. Only right for short steps (a few seconds): away() cuts longer times into those.
 * away: nobody is watching: the club slows down instead of leaving, and nobody joins or moves on either. mine: the turns of
 * the player's own (a finger on the wheel, or pushing it past what the family turns), which alone count for the District
 * conference. */
export function step(g: Game, dt: number, turns: number, speed = 0, away = false, mine = turns): Game {
  if (g.folded) return g;
  const earned = turns * perTurn(g);
  const x = { ...g, h: g.h + earned, all: g.all + earned };
  if (x.mem <= 0) return x.all >= SHOW.club ? { ...x, mem: FOUNDERS, en: 1, stage: 2 } : x;
  const y = fund(work(x, dt), dt);
  const en = tire(y, dt, speed, away, g.en);
  // away, the members stay as they are: nobody leaves, joins or moves on
  const dm = away ? 0 : dt;
  const leave = en < LOW ? (LOW - en) * dm : 0;
  const move = (Math.max(y.mem - FOUNDERS, 0) * dm) / 900;
  const grad = Math.min(FLOW.grad * y.fam[0]! * law(y).join * dm, y.fm[0]!);
  const join = 0.02 * share(y, 4) * law(y).join * dm + grad;
  const z = famFlow(grow(y, Math.max(y.mem - leave - move + join, 0)), dt, grad, g.fam[4] ? move : 0);
  const talk = g.talk && g.talk.t > dt ? { ...g.talk, t: g.talk.t - dt } : null;
  const alum = g.alum + (g.fam[4] ? move : 0);
  const top = Math.max(g.top, heads(z));
  return confer(autoSocial({ ...z, en, alum, talk, top, folded: z.mem <= 0, stage: stageOf(z) }), dt, away ? 0 : mine);
}
/** the family's members dt seconds on: each wheel's own join (FLOW.join a second per level), and along the PIPE `grad` from
 * Interact to ours, `move` from ours to Rotary, and FLOW.feed of Rotary's a second to Inner Wheel and to the Foundation, if
 * they are there; `moved` counts them along each mesh */
function famFlow(g: Game, dt: number, grad: number, move: number): Game {
  const feed = (i: number) => (g.fam[i] ? g.fm[4]! * FLOW.feed * dt : 0);
  const flows = [grad, move, feed(2), feed(5)];
  const d = g.fam.map((n, i) => (g.fm[i]! < FLOW.cap * n ? FLOW.join * n * dt : 0));
  PIPE.forEach(([from, to], e) => {
    if (from >= 0) d[from] = d[from]! - flows[e]!;
    if (to >= 0) d[to] = d[to]! + flows[e]!;
  });
  return { ...g, fm: g.fm.map((m, i) => Math.max(m + d[i]!, 0)), moved: g.moved.map((n, e) => n + flows[e]!) };
}
/** whether family wheel i is too strong for the one it drives (MESH): more than twice its levels and 3 more; never while the
 * one it drives has no level yet (there is nothing to raise) */
export const slipping = (g: Game, i: number): boolean => {
  const p = MESH[i] ?? -1;
  return p >= 0 && g.fam[p]! > 0 && g.fam[i]! > 2 * g.fam[p]! + 3;
};
/** the slips dt seconds on, for one random roll (0 to 1) per wheel: one going on runs out, and a wheel too strong for the one
 * it drives starts one about every SLIP.every seconds */
export const slips = (g: Game, dt: number, rolls: number[]): Game => ({
  ...g,
  slip: g.slip.map((t, i) => {
    if (t > dt) return t - dt;
    return slipping(g, i) && rolls[i]! < dt / SLIP.every ? SLIP.secs : 0;
  }),
});
/** the share of real time the club works while nobody watches: away pays some 35–45 % of what play earns a second at that stage */
export const AWAY = 0.45;
/** the turns per second the wheel turns away: what the family turns, or the hand's top speed; nothing before the club */
export const awaySpeed = (g: Game): number => (g.mem > 0 ? Math.max(idle(g), SPIN[g.spin]![0]) : 0);
/** what happened while nobody watched (the app closed, the tab hidden): AWAY of the time, the wheel turning at awaySpeed() and
 * the committees running, for at most eight hours, four more per level of Treasurer; before there is a club nothing moves.
 * ponytail: five-second steps; smaller ones if the club's energy ever needs to be exact offline. */
export function away(g: Game, now: number): Game {
  // a slip lasts a moment, not the whole time away; away never rolls new ones
  let x = { ...g, slip: g.slip.map(() => 0) };
  const most = (8 + 4 * g.perm[1]!) * 3600;
  for (let left = Math.min(Math.max(now - g.at, 0) / 1000, most); left > 0 && x.mem > 0 && !x.folded; left -= 5) {
    const dt = Math.min(left, 5) * AWAY;
    const v = awaySpeed(x);
    x = step(x, dt, v * dt, v, true);
  }
  return { ...x, at: now };
}
/** what the welcome-back card tells of the time between `was` and `now` (away() of it): the seconds away, the time given,
 * the project runs and the family members who moved along the train (none below 0); null for a
 * minute or less away, or when nothing was given (no club yet, or it folded) */
export interface AwaySum {
  secs: number;
  got: number;
  runs: number;
  moved: number;
}
export function awaySum(was: Game, now: Game): AwaySum | null {
  const secs = (now.at - was.at) / 1000;
  const got = now.all - was.all;
  if (secs <= 60 || got <= 0) return null;
  return {
    secs,
    got,
    runs: Math.max(now.runs - was.runs, 0),
    moved: Math.floor(Math.max(sum(now.moved) - sum(was.moved), 0)),
  };
}
/** the exchange dt seconds on, for one random roll (0 to 1) per club: each price moves by itself, a geometric random walk that
 * rises MARKET.drift a minute (more with Globetrotters, 0.3 % at all of them; the twin club 0.5 % more) and swings by its
 * club's MARKET.vol a tick, less half its square, so that a wild club is not worth more on average than a safe one; the last
 * MARKET.keep prices are kept for the sparkline. Before stage 6 nothing moves. */
export function market(g: Game, dt: number, rolls: number[]): Game {
  if (g.stage < 6) return g;
  const k = dt / MARKET.tick;
  const drift = MARKET.drift + 0.003 * share(g, 3);
  const px = g.px.map((h, i) => {
    // a roll as a swing of mean 0 and spread 1
    const z = (rolls[i]! - 0.5) * Math.sqrt(12);
    const vol = MARKET.vol[i]!;
    const up = ((drift + (g.ga[3] === i ? 0.005 : 0)) * dt) / 60 - (vol * vol * k) / 2;
    return [...h, h.at(-1)! * Math.exp(up + vol * Math.sqrt(k) * z)].slice(-MARKET.keep);
  });
  return { ...g, px };
}
/** club i's price now */
export const price = (g: Game, i: number): number => g.px[i]!.at(-1)!;
/** what the shares of club i are worth now */
export const worth = (g: Game, i: number): number => g.sh[i]! * price(g, i);
/** shares of club i for a part (0 to 1) of the time there is to spend */
export function buyStock(g: Game, i: number, part: number): Game {
  const put = g.h * part;
  if (g.stage < 6 || put < 1) return g;
  return { ...g, h: g.h - put, sh: set(g.sh, i, g.sh[i]! + put / price(g, i)), paid: set(g.paid, i, g.paid[i]! + put) };
}
/** all shares of club i sold at today's price. What counts as earned this year is the rise of the exchange's net gain (sales,
 * and what the other clubs held are up or down now) over the best it was at a sale before: `peak` is that best less the sales'
 * net gain, so losses (sold or still held) are won back first and selling only the clubs that went up earns nothing extra;
 * nothing held, nothing happens */
export function sellAll(g: Game, i: number): Game {
  if (!g.sh[i]) return g;
  const got = worth(g, i);
  const d = got - g.paid[i]!;
  const held = sum(g.sh.map((_, j) => (j === i ? 0 : worth(g, j) - g.paid[j]!)));
  return {
    ...g,
    h: g.h + got,
    all: g.all + Math.max(d + held - g.peak, 0),
    peak: Math.max(g.peak, d + held) - d,
    sh: set(g.sh, i, 0),
    paid: set(g.paid, i, 0),
  };
}
/** what the Foundation gives back for each second put in: 1.2, 5 % more per level of its wheel, up to 10 % more with
 * Globetrotters */
export const fundBack = (g: Game): number => 1.2 + 0.05 * g.fam[5]! + 0.1 * share(g, 3);
/** a quarter of the time there is, put into the Foundation for FUND.secs; at most FUND.most at once */
export function deposit(g: Game): Game {
  const put = g.h / 4;
  if (g.stage < 6 || put < 1 || g.dep.length >= FUND.most) return g;
  return { ...g, h: g.h - put, dep: [...g.dep, { n: put, t: FUND.secs }] };
}
/** the Foundation dt seconds on: deposits whose time is up come back with fundBack(), the gain counted as earned */
export function fund(g: Game, dt: number): Game {
  if (!g.dep.length) return g;
  const dep = g.dep.map((d) => ({ ...d, t: d.t - dt }));
  const back = sum(dep.filter((d) => d.t <= 0).map((d) => d.n));
  const got = back * fundBack(g);
  return { ...g, h: g.h + got, all: g.all + got - back, dep: dep.filter((d) => d.t > 0) };
}
/** the role (TEXT.ranks): Guest until you join your home club, Member, Board with the projects (stage 4), President with the
 * Avenues (stage 5), Rotarian once a year was handed over, then DRR, Governor, RI President by the layer (one after the other:
 * the layers make no one DRR who has not handed a year over) */
export const rank = (g: Game): number =>
  g.mem <= 0 && !g.folded ? 0 : Math.max(1, g.stage >= 4 ? 2 : 0, g.stage >= 5 ? 3 : 0, g.years > 0 ? 4 + layer(g) : 0);
/** what each role takes (TEXT.ladder.how): the time earned in all to join, the members for Board and President, the people
 * helped for the handover that makes you a Rotarian, the chartered clubs for each layer */
export const ROLE_NEED = [0, SHOW.club, GATE.proj, GATE.av, HAND_AT, LAYER.at[1]!, LAYER.at[2]!, LAYER.at[3]!];
/** how far role r's need is met: what ROLE_NEED counts for it */
const roleHas = (g: Game, r: number): number => {
  if (r <= 1) return g.all;
  if (r <= 3) return heads(g);
  return r === 4 ? helped(g) : g.chart;
};
/** the next role up and how far it is: [role, what is there (at most the need), the need]; null at the top */
export function nextRole(g: Game): [number, number, number] | null {
  const r = rank(g) + 1;
  const need = ROLE_NEED[r];
  return need === undefined ? null : [r, Math.min(roleHas(g, r), need), need];
}
/** a rate eased towards v over dt seconds, so that it settles over RATE_SECS and does not flicker */
export const RATE_SECS = 3;
export const ease = (r: number, v: number, dt: number): number => r + (v - r) * (1 - Math.exp(-dt / RATE_SECS));
/** the share of its recent top under which the rate counts as stopped, and the seconds over which that top fades */
export const RATE_CUT = 0.05;
export const RATE_TOP = 30;
/** the rate r and its recent top, dt seconds on at v earned a second: eased toward v; 0 at once at a new year (less earned in
 * all than before: v < 0), and 0 once under RATE_CUT of the top (earning stopped), so it never trails off for ever */
export function rateOn(r: number, top: number, v: number, dt: number): [number, number] {
  if (v < 0) return [0, 0];
  const x = ease(r, v, dt);
  const t = Math.max(x, top * Math.exp(-dt / RATE_TOP));
  return [x < RATE_CUT * t ? 0 : x, t];
}
/** the next upcoming event of the player's clubs within EVENT.days of now that was not run yet, for a real event's card */
export function realEvent(
  events: readonly Event[],
  clubs: readonly string[],
  now: number,
  done: string[],
): Event | undefined {
  const soon = (e: Event) => {
    const at = new Date(e.start).getTime();
    return at > now && at - now <= EVENT.days * DAY * 1000;
  };
  return events
    .filter((e) => !e.cancelled && !done.includes(e.id) && soon(e) && e.clubs.some((c) => clubs.includes(c)))
    .sort((a, b) => a.start.localeCompare(b.start))[0];
}
/** whether the wheel's own upgrades have something to buy: Handshake, or Momentum, Swipe or Hold once shown */
const wheelNews = (g: Game): boolean =>
  g.h >= gripPrice(g) ||
  (g.all >= SHOW.oil && g.oil < OIL_MAX && g.h >= oilPrice(g)) ||
  (g.all >= SHOW.swipe && g.spin === 0 && g.h >= SPIN[1][1]) ||
  (g.all >= SHOW.hold && g.spin === 1 && g.h >= SPIN[2][1]);
/** what is worth a look on each tab (a dot on it): an upgrade or family wheel to buy, a tired club or Avenue points to give, no
 * project yet or one to buy, nothing on the exchange or in the Foundation yet, a club to charter or a conference to start,
 * something for the helpers to buy */
export const news = (g: Game): boolean[] => [
  wheelNews(g) || FAM.some((_, i) => i < shownFam(g) && g.h >= famPrice(g, i)),
  g.en < 0.35 || (g.stage >= 5 && ptsLeft(g) > 0),
  g.own[0] === 0 ||
    PROJ.some(
      (_, i) => i < shownProj(g) && (g.h >= projPrice(g, i) || (g.own[i]! > 0 && !g.com[i] && g.h >= comPrice(i))),
    ),
  g.stage >= 6 && !g.dep.length && g.sh.every((n) => n === 0),
  (canCharter(g) && g.h >= charterPrice(g)) || canConf(g),
  PERM.some((_, k) => g.perm[k]! < PERM[k]!.most && g.helpers >= permPrice(g, k)),
];

/** the next chartered club: CHARTER.price, CHARTER.up times that for every one before */
export const charterPrice = (g: Game): number => CHARTER.price * CHARTER.up ** g.chart;
/** whether a club may be chartered: CHARTER.per per level of the Districts wheel, and its members free while the founders stay */
export const canCharter = (g: Game): boolean =>
  g.chart < CHARTER.per * g.fam[6]! && free(g) >= CHARTER.crew && heads(g) - CHARTER.crew >= FOUNDERS;
/** a club chartered: its price paid, and CHARTER.crew members gone to found it */
export const charter = (g: Game): Game =>
  canCharter(g) ? pay(g, charterPrice(g), (x) => ({ ...grow(x, x.mem - CHARTER.crew), chart: x.chart + 1 })) : g;
/** whether the District conference can start: from the District layer on, none going on and the last one long enough ago */
export const canConf = (g: Game): boolean => layer(g) >= 1 && !g.conf && g.cool <= 0;
export const startConf = (g: Game): Game => (canConf(g) ? { ...g, conf: { t: 0, n: 0 }, cool: CONF.cool } : g);
/** the conference, the doubled time and the cooldown dt seconds and `turns` turns on: CONF.turns turns within CONF.secs win
 * CONF.boost seconds of doubled time, else it is over with nothing */
export function confer(g: Game, dt: number, turns: number): Game {
  const cool = Math.max(g.cool - dt, 0);
  const boost = Math.max(g.boost - dt, 0);
  if (!g.conf) return { ...g, cool, boost };
  const conf = { t: g.conf.t + dt, n: g.conf.n + turns };
  if (conf.n >= CONF.turns) return { ...g, cool, boost: CONF.boost, conf: null };
  return { ...g, cool, boost, conf: conf.t >= CONF.secs ? null : conf };
}
/** the people helped this year, from the time earned (2.5 at a year of service, 25 at a hundred years) and HELP_CLUB by every
 * club chartered: slow at first, faster and faster (a handover is possible after about 45 minutes of play) */
export const HELP_CLUB = 1;
export const helped = (g: Game): number => Math.floor(2.5 * Math.sqrt(g.all / YEAR)) + HELP_CLUB * g.chart;
/** the next level of what helpers buy, k */
export const permPrice = (g: Game, k: number): number => PERM[k]!.per * (g.perm[k]! + 1);
export const buyPerm = (g: Game, k: number): Game =>
  g.perm[k]! >= PERM[k]!.most || g.helpers < permPrice(g, k)
    ? g
    : { ...g, helpers: g.helpers - permPrice(g, k), perm: set(g.perm, k, g.perm[k]! + 1) };
/** the founders of next year's club: three, and one per hundred helpers */
export const founders = (helpers: number): number => FOUNDERS + Math.floor(helpers / 100);
/** a new year from zero with the votes `ga`, for a part of the people helped (all at a handover, half when the club folded):
 * they become helpers; the chartered clubs, the years handed over, the helpers' upgrades, every stage and the real events
 * run (each runs once) stay */
export function newYear(g: Game, ga: number[], part: number): Game {
  const helpers = g.helpers + Math.floor(helped(g) * part);
  return {
    ...fresh(g.at),
    stage: 8,
    mem: founders(helpers),
    chart: g.chart,
    evs: g.evs,
    years: g.years + (part >= 1 ? 1 : 0),
    helpers,
    perm: g.perm,
    ga,
    sfx: g.sfx,
    music: g.music,
    bulk: g.bulk,
  };
}
/** the handover, from stage 8 once HAND_AT people were helped: the General Assembly's votes `ga` for next year */
export const handover = (g: Game, ga: number[]): Game =>
  g.stage >= 8 && helped(g) >= HAND_AT && !g.folded ? newYear(g, ga, 1) : g;
/** a new club after one folded: from stage 7 on a new year with half the people helped, before that the game from zero (the
 * real events run stay run) */
export const refound = (g: Game): Game =>
  g.stage >= 7 ? newYear(g, g.ga, 0.5) : { ...fresh(g.at), evs: g.evs, sfx: g.sfx, music: g.music, bulk: g.bulk };
