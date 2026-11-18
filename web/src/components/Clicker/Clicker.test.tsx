// The idle clicker's sums (./game), and the oath that opens it.
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  ease,
  rateOn,
  nextRole,
  GATE,
  ROLE_NEED,
  away,
  AWAY,
  awaySpeed,
  awaySum,
  BASE,
  BURN,
  best,
  buyCom,
  buyFam,
  FLOW,
  MESH,
  PIPE,
  SLIP,
  slipping,
  slips,
  buySocCom,
  flipCom,
  flipSoc,
  SOC_COM,
  socComPrice,
  buyGrip,
  buyOil,
  buyProj,
  buySpin,
  buyPerm,
  buyStock,
  canCharter,
  CHARTER,
  charter,
  charterPrice,
  CONF,
  confer,
  deposit,
  founders,
  gain,
  handover,
  helped,
  layer,
  law,
  newYear,
  CULT,
  RHYTHM,
  effects,
  permPrice,
  refound,
  startConf,
  EX_AT,
  FUND,
  fund,
  fundBack,
  MARKET,
  market,
  price,
  sellAll,
  worth,
  comPrice,
  crowd,
  FAM_IDLE,
  FAM_TURN,
  HAND_AT,
  FAM_UP,
  GRIP,
  IDLE_MAX,
  KICK,
  kick,
  OIL,
  OIL_MAX,
  oilPrice,
  PROJ,
  RECRUIT,
  SOCIAL,
  SPIN,
  size,
  TURN,
  drain,
  FAM,
  FAM_AT,
  GLIDE,
  PROJ_UP,
  affordable,
  amount,
  bulkPrice,
  buyLevels,
  nextMile,
  series,
  setBulk,
  twice,
  famPrice,
  free,
  fresh,
  glide,
  gripPrice,
  heads,
  idle,
  LOW,
  mentors,
  mix,
  news,
  perRun,
  perTurn,
  points,
  projPrice,
  ptsLeft,
  realEvent,
  rank,
  recruit,
  recruitPrice,
  refill,
  ring,
  bellEvery,
  bellQuiet,
  bulkShown,
  grow,
  runTime,
  setPts,
  share,
  SHOW,
  shownFam,
  shownProj,
  social,
  socialPrice,
  speedUp,
  startEvent,
  startRun,
  step,
  talk,
  TALK,
  trained,
  type Game,
  working,
  CARDS,
  shownCards,
  buyHold,
} from "./game";
import type { Event as AppEvent } from "../../lib/types";
import { OATH, Oath } from "./Oath";
import { cue } from "./fx";
import { hush, hz, music, musicVol, notesAt, play, tickHz, unlock } from "./sound";
import { fmt, parts, TEXT } from "./text";
import { DOCK, dock, drawn, fit, type Gear, placed, teeth, train } from "./Train";
import { spanned } from "./Exchange";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
/** a club just founded, with hours to spend */
const club = (h = 1000): Game => ({ ...step({ ...fresh(0), all: SHOW.club }, 0, 0), h });
/** x to nine significant digits, for the tiny and the huge amounts of time */
const near = (x: number) => expect.closeTo(x, 9 - Math.floor(Math.log10(Math.abs(x) || 1)));
const fams = (...levels: number[]) => FAM.map((_, i) => levels[i] ?? 0);

describe("Clicker", () => {
  it("time is told from nanoseconds up, three digits, never rounded up", () => {
    expect([fmt(0), fmt(3.75e-7), fmt(9.9996e-4), fmt(45.239), fmt(3 * 3600)]).toEqual([
      "0 ns",
      "375 ns",
      expect.stringMatching(/^999 .s$/),
      "45.2 secs",
      "3.00 hrs",
    ]);
    // the score keeps the number and the unit (a compact letter with it) apart
    expect([parts(45.239), parts(1.23e9 * 31_536_000)]).toEqual([
      ["45.2", " secs"],
      ["1.23", "B yrs"],
    ]);
  });
  it("the upgrade cards come in a fixed order, the family's once it is there: a new one takes its 🔒 card's place", () => {
    expect(CARDS.map((c) => c.id)).toEqual([
      "grip",
      "oil",
      "swipe",
      "fam0",
      "fam1",
      "hold",
      "fam2",
      "fam3",
      "fam4",
      "fam5",
      "fam6",
    ]);
    const g = fresh(0);
    expect([
      shownCards(g),
      shownCards({ ...g, all: SHOW.swipe }),
      shownCards({ ...g, all: 30, stage: 2 }), // the family waits for its stage, and so does Hold after it
      shownCards({ ...g, all: 30, stage: 3 }),
      shownCards({ ...g, all: 1e12, stage: 3 }),
    ]).toEqual([1, 3, 3, 6, CARDS.length]);
    // Hold only after Swipe
    expect([buyHold({ ...g, h: 1e3 }), buyHold({ ...g, h: 1e3, spin: 1 }).spin]).toEqual([{ ...g, h: 1e3 }, 2]);
  });
  it("the wheel earns time; Handshake makes a turn earn more and a tap push harder, Momentum lets it run on", () => {
    let g = step(fresh(0), 1, 15);
    expect([g.h, g.all, perTurn(g), glide(g), kick(g)]).toEqual([15 * TURN, 15 * TURN, TURN, GLIDE, KICK]);
    g = buyGrip({ ...g, h: GRIP[0] });
    expect([g.h, g.grip, perTurn(g), gripPrice(g), kick(g)]).toEqual([
      0,
      1,
      near(GRIP[2] * TURN),
      near(GRIP[0] * GRIP[1]),
      near(1.01 * KICK),
    ]);
    expect(buyGrip(g)).toBe(g); // the time does not reach
    g = buyOil({ ...g, h: OIL[0] });
    expect([g.h, g.oil, glide(g), oilPrice(g)]).toEqual([0, 1, near(GLIDE * 1.03), near(OIL[0] * OIL[1])]);
    expect(buyOil({ ...g, oil: OIL_MAX, h: 1e9 }).oil).toBe(OIL_MAX); // the most there is
    // spending does not take back what was earned
    expect(g.all).toBe(15 * TURN);
  });
  it("bulk buying: a geometric series' price, as many as the time buys, ×1 / ×10 / ×Max, never past the most", () => {
    expect([
      series(1, 2, 3),
      series(5, 1.1, 0),
      affordable(1, 2, 6.9),
      affordable(1, 2, 7),
      affordable(1, 2, 0.5),
    ]).toEqual([7, 0, 2, 3, 0]);
    // the series and what it buys agree, whatever the rounding
    for (const h of [1e-6, 3.3e-3, 0.71, 12, 4e5, 9.9e9]) {
      const k = affordable(GRIP[0], GRIP[1], h);
      expect(series(GRIP[0], GRIP[1], k) <= h && series(GRIP[0], GRIP[1], k + 1) > h).toBe(true);
    }
    const g = { ...fresh(0), h: series(GRIP[0], GRIP[1], 12) };
    expect([amount(g, "grip"), amount({ ...g, bulk: 10 }, "grip"), amount({ ...g, bulk: 0 }, "grip")]).toEqual([
      1, 10, 12,
    ]);
    // ×Max with nothing affordable: one, at the price of one
    expect([amount({ ...g, h: 0, bulk: 0 }, "grip"), bulkPrice({ ...g, h: 0, bulk: 0 }, "grip")]).toEqual([1, GRIP[0]]);
    const ten = buyLevels({ ...g, bulk: 10 }, "grip");
    expect([ten.grip, ten.h]).toEqual([10, near(g.h - series(GRIP[0], GRIP[1], 10))]);
    expect(buyLevels({ ...g, bulk: 0 }, "grip").grip).toBe(12);
    expect(buyLevels({ ...g, h: 0, bulk: 10 }, "grip")).toEqual({ ...g, h: 0, bulk: 10 }); // the time does not reach
    // Momentum stops at OIL_MAX: ×10 five short of it takes the last five, at OIL_MAX nothing
    const o = { ...g, oil: OIL_MAX - 5, h: 1e9, bulk: 10 };
    expect([amount(o, "oil"), buyLevels(o, "oil").oil, amount({ ...o, oil: OIL_MAX }, "oil")]).toEqual([5, OIL_MAX, 0]);
    // a family wheel not shown yet sells nothing; projects by the dozen
    expect(buyLevels({ ...o, bulk: 1 }, "fam0")).toEqual({ ...o, bulk: 1 });
    const p = buyLevels({ ...club(1e6), bulk: 10 }, "proj0");
    expect([p.own[0], p.h]).toEqual([10, near(1e6 - series(PROJ[0]!.price, PROJ_UP, 10))]);
    // the setting is kept across years
    expect([setBulk(g, 0).bulk, refound({ ...g, bulk: 10 }).bulk]).toEqual([0, 10]);
    // the toggle shows once ten of a card are affordable, from stage 3, or once chosen
    const c = { ...club(0), h: series(GRIP[0], GRIP[1], 10) * 0.99 };
    expect([
      bulkShown(c),
      bulkShown({ ...c, h: series(GRIP[0], GRIP[1], 10) }),
      bulkShown({ ...c, stage: 3 }),
      bulkShown({ ...c, bulk: 0 }),
    ]).toEqual([false, true, true, true]);
  });
  it("milestones: at 10, 25, 50 and 100 levels an upgrade's effect doubles", () => {
    expect([9, 10, 25, 49, 50, 100, 400].map(twice)).toEqual([1, 2, 4, 4, 8, 16, 16]);
    expect([0, 10, 24, 99, 100].map(nextMile)).toEqual([10, 25, 25, 100, undefined]);
    const g = fresh(0);
    expect(perTurn({ ...g, grip: 10 })).toBeCloseTo(TURN * GRIP[2] ** 10 * 2, 15);
    expect(glide({ ...g, oil: OIL_MAX })).toBeCloseTo(GLIDE * 1.03 ** OIL_MAX * 8);
  });
  it("by hand alone it creeps: a tap is a couple of hundred nanoseconds, and the badly oiled wheel stops almost at once", () => {
    // a tap pushes it by KICK turns a second, which glide() lets run out within a fraction of a second: a fiftieth of a turn
    expect(KICK * glide(fresh(0)) * perTurn(fresh(0))).toBeCloseTo(1.8e-7, 12);
    expect(glide(fresh(0))).toBeLessThan(0.2);
    expect([idle(fresh(0)), idle(club())]).toEqual([0, 0]);
  });
  it("swiping, then holding, are bought one after the other", () => {
    const g = buySpin({ ...fresh(0), h: SPIN[2][1] + 1 });
    expect([g.spin, g.h, buySpin(g).spin, buySpin(buySpin(g))]).toEqual([
      1,
      SPIN[2][1] + 1 - SPIN[1][1],
      2,
      buySpin(g),
    ]);
  });
  it("you join your home club at enough time earned: you are a member, and its members make the wheel bigger", () => {
    const before = step(fresh(0), 0, 0);
    expect([before.mem, rank(before), recruit({ ...before, h: 1e9 })]).toEqual([0, 0, { ...before, h: 1e9 }]);
    const g = club();
    expect([g.mem, g.en, g.stage, rank(g), size(g), perTurn(g)]).toEqual([3, 1, 2, 1, 3, near(3 * TURN)]);
    // more members, more a turn; not faster: only the family turns it by itself
    expect([perTurn({ ...g, mem: 6 }), idle({ ...g, mem: 30 })]).toEqual([near(6 * TURN), 0]);
  });
  it("members cost an info evening each, dearer every time", () => {
    let g = club(1);
    expect(recruitPrice(g)).toBe(RECRUIT[0]);
    g = recruit(g);
    expect([g.mem, g.h, recruitPrice(g)]).toEqual([4, near(1 - RECRUIT[0]), near(RECRUIT[0] * RECRUIT[1])]);
  });
  it("work tires the club, spinning faster than it keeps up with more; a social gives half of it back", () => {
    const g = club();
    expect(step(g, 100, 0).en).toBeCloseTo(1 - 100 * 2 * BASE); // three members: two doublings
    expect(step(g, 10, 0, 2.3).en).toBeCloseTo(1 - 10 * (2 * BASE + BURN)); // a turn a second over the 1.3 they keep up with
    // what the family turns by itself never tires them
    const f = { ...g, fam: fams(0, 0, 50) };
    expect(step(f, 10, 0, idle(f)).en).toBeLessThan(1);
    expect(step(f, 10, 0, idle(f)).en).toBeGreaterThan(1 - 10 * 2 * BASE - 1e-9);
    const tired = { ...g, en: 0.3 };
    expect([social(tired).en, social(tired).h, socialPrice(g)]).toEqual([
      0.8,
      1000 - socialPrice(g),
      near(SOCIAL * 3 * TURN),
    ]);
    expect(social({ ...g, en: 0.9 }).en).toBe(1); // never over full
    expect(social(g)).toBe(g); // nothing to refill
  });
  it("under LOW members leave; with the last one the club folds and nothing moves any more", () => {
    const g = { ...club(), en: LOW };
    expect(step(g, 1, 0).mem).toBeLessThan(3);
    let x = { ...g, en: 0 };
    for (let i = 0; i < 20 && !x.folded; i++) x = step(x, 1, 0);
    expect([x.folded, x.mem]).toEqual([true, 0]);
    expect([step(x, 5, 10), recruit(x), social(x)]).toEqual([x, x, x]);
  });
  it("a member who is leaving still counts until gone", () => {
    const g = { ...club(), mem: 7.6 };
    expect([heads(g), size(g), rank(g)]).toEqual([8, 8, 1]);
  });
  it("those beyond the founders move on to Rotary in time; the founders stay", () => {
    expect(step({ ...club(), mem: 13 }, 9, 0).mem).toBeCloseTo(12.9);
    expect(step(club(), 9, 0).mem).toBe(3);
  });
  it("while away the club works AWAY of the time, the wheel at the hand's top speed or the family's, for at most eight hours, and the members stay as they are", () => {
    expect(away(fresh(0), 3_600_000)).toEqual({ ...fresh(0), at: 3_600_000 }); // no club, no wheel turning
    expect(awaySpeed(fresh(0))).toBe(0);
    // no family: it turns at a tap's top speed, for AWAY of the time
    expect(awaySpeed(club(0))).toBe(SPIN[0][0]);
    expect(awaySpeed({ ...club(0), spin: 2 })).toBe(SPIN[2][0]);
    const one = 8 * 3600 * 3 * TURN;
    expect(away(club(0), 24 * 3_600_000).h).toBeCloseTo(AWAY * SPIN[0][0] * one, 9);
    const g = away({ ...club(0), fam: fams(0, 0, 1) }, 24 * 3_600_000);
    // one level of Inner Wheel turns it slower than that: the hand's share counts
    expect(g.h).toBeCloseTo(AWAY * SPIN[0][0] * one * (1 + FAM_TURN), 9);
    expect([g.mem, g.en, g.folded]).toEqual([3, 0.3, false]);
    // twenty levels turn it faster: the family's speed counts (Inner Wheel, the third wheel, three times what Interact would)
    const f = { ...club(0), fam: fams(0, 0, 20) };
    expect(awaySpeed(f)).toBeCloseTo(3 * 20 * FAM_IDLE);
    expect(away(f, 24 * 3_600_000).h).toBeCloseTo(AWAY * awaySpeed(f) * 8 * 3600 * perTurn(f), 6);
    // closed while already exhausted: nobody leaves while nobody watches
    expect(away({ ...club(0), en: 0.05 }, 3_600_000)).toMatchObject({ mem: 3, en: 0.05, folded: false });
    // nor joins (Mentors, Interact) or moves on to Rotary, so hours away pay as minutes do
    const m = { ...club(0), mem: 20, kind: [0, 0, 0, 0, 20], fam: fams(5, 0, 0, 0, 1), fm: fams(40), at: 0 };
    expect(away(m, 3 * 3_600_000).mem).toBe(20);
  });
  it("away, the committees run in full and their runs count; projects run by hand do not start again", () => {
    const g = { ...buyCom(buyProj(club(1e6), 0), 0), mem: 6, en: 1 };
    const x = away({ ...g, at: 0 }, 600_000);
    expect(x.runs).toBe(Math.floor((AWAY * 600) / runTime(g, 0)));
    const hand = startRun({ ...buyProj(club(1e6), 0), mem: 6 }, 0);
    expect(away({ ...hand, at: 0 }, 600_000).runs).toBe(1);
  });
  it("the welcome-back card: the time away, the time given, project runs, family moves; none under a minute", () => {
    const was = { ...club(0), at: 0, runs: 4, moved: [1, 2, 0, 0], mem: 7 };
    const now = { ...was, at: 3_600_000, all: was.all + 50, runs: 10, moved: [3.5, 2.6, 0, 0], mem: 9.2 };
    expect(awaySum(was, now)).toEqual({ secs: 3600, got: 50, runs: 6, moved: 3 });
    expect(awaySum(was, { ...now, at: 60_000 })).toBeNull(); // a minute
    expect(awaySum(was, { ...now, all: was.all })).toBeNull(); // nothing given
    // of away() itself
    const f = { ...club(0), fam: fams(0, 0, 1, 0, 1), fm: fams(0, 0, 0, 0, 10), at: 0 };
    const s = awaySum(f, away(f, 2 * 3_600_000))!;
    expect([s.secs, s.got > 0, s.moved > 0]).toEqual([7200, true, true]);
  });
  it("the stages come one after the other: family at FAM_AT, projects and Avenues at their members", () => {
    const g = club(0);
    expect([step({ ...g, mem: 12 }, 0, 0).stage, step({ ...g, all: FAM_AT }, 0, 0).stage]).toEqual([2, 3]);
    const f = { ...g, all: FAM_AT, stage: 3 };
    expect([step({ ...f, mem: 5 }, 0, 0).stage, step({ ...f, mem: 6 }, 0, 0).stage]).toEqual([3, 4]);
    expect([step({ ...f, mem: 12 }, 0, 0).stage, step({ ...f, mem: 12, stage: 4 }, 0, 0).stage]).toEqual([4, 5]);
    // the stage stays when members leave again
    expect(step({ ...f, mem: 5, stage: 4 }, 0, 0).stage).toBe(4);
  });
  it("projects come at GATE.proj members, the first at once, each other at half its first price, dearer by 15 % each", () => {
    const g = { ...club(1000), mem: 6, stage: 4 };
    expect([
      shownProj({ ...g, stage: 3, all: 1e9 }),
      shownProj({ ...g, all: 1 }),
      shownProj({ ...g, all: 1.5 }),
      shownProj({ ...g, all: 120 }),
    ]).toEqual([0, 1, 1, 2]);
    const x = buyProj(g, 0);
    expect([x.own[0], x.h, projPrice(x, 0), perRun(x, 0)]).toEqual([1, 997, near(3 * 1.15), PROJ[0]!.brings]);
    expect(buyProj({ ...x, h: 0 }, 0)).toEqual({ ...x, h: 0 });
  });
  it("a run by hand needs its crew free, pays at its end, frees the crew and tires the club", () => {
    const bought = buyProj({ ...club(1000), stage: 4 }, 0);
    let g = startRun(bought, 0);
    expect([g.run[0], free(g), startRun(g, 0)]).toEqual([0, 2, g]);
    g = step(g, 2, 0);
    expect([g.run[0], g.h]).toEqual([2, 997]);
    g = step(g, 1, 0);
    expect([g.run[0], g.h, g.all, free(g)]).toEqual([-1, 997.4, near(SHOW.club + 0.4), 3]);
    expect(g.en).toBeCloseTo(1 - 0.003 - 3 * 2 * BASE);
    // not owned, or not enough free members: no run
    expect(startRun(g, 1)).toBe(g);
    const busy = { ...g, own: [1, 1, 0, 0, 0, 0, 0, 0], run: [-1, 0, -1, -1, -1, -1, -1, -1] };
    expect([free(busy), startRun({ ...busy, mem: 2 }, 0).run[0]]).toEqual([1, -1]);
  });
  it("the year counts its project runs and the most members the club had; a new year counts from zero", () => {
    const bought = buyProj({ ...club(1000), stage: 4 }, 0);
    const g = step(step(startRun(bought, 0), 3, 0), 0, 0);
    expect([g.runs, g.top]).toEqual([1, 3]);
    // a committee's runs, as many as the time holds
    const c = step(
      {
        ...club(),
        own: [10, 0, 0, 0, 0, 0, 0, 0],
        com: [true, false, false, false, false, false, false, false],
        run: [0, -1, -1, -1, -1, -1, -1, -1],
      },
      3,
      0,
    );
    expect(c.runs).toBe(2);
    expect(step({ ...g, mem: 2 }, 0, 0).top).toBe(3);
    expect([newYear(g, g.ga, 1).runs, newYear(g, g.ga, 1).top]).toEqual([0, 0]);
  });
  it("a vote's effects in whole percent, as the chips say them", () => {
    expect(effects({ dur: 1.1, drain: 0.7 })).toEqual([
      ["dur", 10],
      ["drain", -30],
    ]);
    expect(effects(RHYTHM[1]!)).toEqual([
      ["idle", -15],
      ["drain", -30],
    ]);
    expect(CULT.every((m) => effects(m).every(([, n]) => n !== 0))).toBe(true);
  });
  it("milestones make runs twice as fast each, not more tiring", () => {
    expect([speedUp(9), speedUp(10), speedUp(25), speedUp(200)]).toEqual([1, 2, 4, 32]);
    const g = { ...club(), own: [10, 0, 0, 0, 0, 0, 0, 0] };
    expect(runTime(g, 0)).toBe(1.5);
    const x = step(startRun(g, 0), 1.5, 0);
    expect(x.h - g.h).toBeCloseTo(4);
    expect(x.en).toBeCloseTo(1 - 0.003 / 2 - 1.5 * 2 * BASE);
  });
  it("a committee takes its crew for good and runs the project by itself, as often as the time holds", () => {
    const g = buyProj(club(comPrice(0) + 3), 0);
    expect(buyCom({ ...g, h: 0 }, 0)).toEqual({ ...g, h: 0 });
    const c = buyCom(g, 0);
    expect([c.com[0], c.run[0], c.h, free(c), startRun(c, 0)]).toEqual([true, 0, 0, 2, c]);
    const x = step(c, 4, 0);
    expect([x.h, x.run[0]]).toEqual([0.4, 1]);
    expect(step({ ...c, own: [100, 0, 0, 0, 0, 0, 0, 0] }, 1, 0).h).toBeCloseTo(40 * Math.floor(1 / (3 / 16)));
  });
  it("committees pause from the last one up when members are too few", () => {
    const g = {
      ...club(),
      mem: 3,
      own: [1, 1, 0, 0, 0, 0, 0, 0],
      com: [true, true, false, false, false, false, false, false],
    };
    expect([working(g), free(g)]).toEqual([[true, true, false, false, false, false, false, false], 0]);
    const few = { ...g, mem: 2 };
    expect([working(few), free(few)]).toEqual([[true, false, false, false, false, false, false, false], 1]);
    const x = step({ ...few, run: [0, 0, -1, -1, -1, -1, -1, -1] }, 1, 0);
    expect(x.run.slice(0, 2)).toEqual([1, 0]); // the paused one stands still
  });
  it("a committee switched off stands still and frees its crew; on again, it runs", () => {
    const c = buyCom(buyProj(club(comPrice(0) + 3), 0), 0);
    const off = flipCom(c, 0);
    expect([off.off[0], working(off)[0], free(off), step(off, 4, 0).run[0]]).toEqual([true, false, 3, 0]);
    expect(step(flipCom(off, 0), 4, 0).run[0]).toBe(1);
    expect(flipCom(c, 1)).toBe(c); // no committee to switch
    // its crew taken by a run by hand meanwhile: on again, it waits for them
    const hand = startRun({ ...off, mem: 2, own: [1, 1, 0, 0, 0, 0, 0, 0] }, 1);
    expect([hand.run[1], working(flipCom(hand, 0))[0], free(flipCom(hand, 0))]).toEqual([0, false, 0]);
  });
  it("the Social committee, from the projects on, throws a social by itself under 40 % energy while it is on", () => {
    const g = club(1000);
    expect(buySocCom(g)).toBe(g); // before the projects
    const c = buySocCom({ ...g, stage: 4 });
    expect([c.soc, c.h, buySocCom(c)]).toEqual([true, near(1000 - socComPrice(g)), c]);
    const tired = { ...c, en: SOC_COM.under - 0.1 };
    expect(step(tired, 0.1, 0).en).toBeGreaterThan(0.75);
    expect(step(flipSoc(tired), 0.1, 0).en).toBeLessThan(SOC_COM.under);
    expect(step({ ...tired, en: SOC_COM.under + 0.1 }, 0.1, 0).en).toBeLessThan(SOC_COM.under + 0.1); // not due yet
    expect([flipSoc(g), step({ ...tired, h: 0 }, 0.1, 0).en < SOC_COM.under]).toEqual([g, true]); // none, or no time
  });
  it("a real event of your clubs within two weeks: one run, once, paying 50 of the best project's runs", () => {
    const ev = (id: string, start: string, clubs = ["bern"]): AppEvent =>
      ({ id, start, clubs, cancelled: false }) as AppEvent;
    const now = new Date("2026-11-16T12:00").getTime();
    const list = [
      ev("far", "2026-12-20T18:00"),
      ev("later", "2026-11-25T18:00"),
      ev("other", "2026-11-17T18:00", ["zug"]),
      ev("soon", "2026-11-20T18:00"),
      ev("past", "2026-11-15T18:00"),
    ];
    expect(realEvent(list, ["bern"], now, [])?.id).toBe("soon");
    expect(realEvent(list, ["bern"], now, ["soon"])?.id).toBe("later");
    expect(realEvent(list, ["luzern"], now, [])).toBeUndefined();
    let g = startEvent({ ...buyProj(club(1000), 0) }, "soon");
    expect([g.ev, free(g), best(g)]).toEqual([{ id: "soon", t: 0 }, 1, 0.4]);
    expect(startEvent(g, "later")).toBe(g); // one at a time
    g = step(g, 30, 0);
    expect([g.ev, g.evs, g.h]).toEqual([null, ["soon"], 997 + 50 * 0.4]);
    expect(startEvent(g, "soon")).toBe(g); // once per event
  });
  it("a dot on a tab worth a look: an upgrade to buy, a tired club, a project", () => {
    const g = { ...club(1e6), all: 1e6, en: 0.3 };
    expect(news({ ...g, stage: 2 }).slice(0, 2)).toEqual([true, true]);
    expect(news({ ...g, stage: 4 }).slice(0, 3)).toEqual([true, true, true]);
    expect(news({ ...g, stage: 4, own: [1, 0, 0, 0, 0, 0, 0, 0], h: 0, en: 1 }).slice(0, 3)).toEqual([
      false,
      false,
      false,
    ]);
  });
  it("the Avenues come at GATE.av members, as you become President: two points and one per role above Member", () => {
    const g = step({ ...club(), mem: 12, stage: 4 }, 0, 0);
    expect([g.stage, points(g), ptsLeft(g)]).toEqual([5, 4, 4]);
    // members leaving do not take the points back
    expect(points({ ...g, mem: 5 })).toBe(4);
    expect([
      points({ ...g, years: 1 }),
      points({ ...g, years: 1, chart: 3 }),
      points({ ...g, perm: [0, 0, 0, 2] }),
    ]).toEqual([5, 6, 6]);
  });
  it("points move any time, as far as they go", () => {
    let g = { ...club(), mem: 12, stage: 5 };
    g = setPts(g, 2, 3);
    expect([g.pts, ptsLeft(g)]).toEqual([[0, 0, 3, 0, 0], 1]);
    g = setPts(g, 0, 9);
    expect(g.pts).toEqual([1, 0, 3, 0, 0]);
    expect(setPts(g, 2, -1).pts).toEqual([1, 0, 0, 0, 0]);
  });
  it("new members take the kinds by the points, those leaving take every kind alike", () => {
    const g = { ...club(), mem: 12, stage: 5, pts: [1, 0, 3, 0, 0] };
    const x = grow(g, 16);
    expect([x.mem, x.kind]).toEqual([16, [1, 0, 3, 0, 0]]);
    expect(mix(x)).toEqual([1, 0, 3, 0, 0, 12]);
    expect(grow(x, 8).kind).toEqual([0.5, 0, 1.5, 0, 0]);
    expect(grow({ ...g, pts: [0, 0, 0, 0, 0] }, 16).kind).toEqual([0, 0, 0, 0, 0]); // no points: plain
    expect(recruit({ ...g, h: 1e9 }).kind).toEqual([0.25, 0, 0.75, 0, 0]);
    expect(grow(x, 0).kind).toEqual([0, 0, 0, 0, 0]);
  });
  it("the crowd shows the kinds in proportion", () => {
    const g = { ...club(), mem: 4, kind: [1, 0, 2, 0, 0] };
    expect([crowd(g, 4), crowd(club(), 3)]).toEqual([
      [0, 2, 2, 5],
      [5, 5, 5],
    ]);
  });
  it("each kind does its Avenue's work, by its share of the members", () => {
    const g = { ...club(1e6), mem: 10, own: [1, 0, 0, 0, 0, 0, 0, 0] };
    const all = (k: number) => ({ ...g, kind: [0, 1, 2, 3, 4].map((i) => (i === k ? 10 : 0)) });
    expect([share(all(0), 0), drain(all(0)), refill(all(0))]).toEqual([1, 0.5, 0.8]);
    expect(runTime(all(1), 0)).toBe(1.5);
    expect(perRun(all(2), 0)).toBe(0.8);
    expect(recruitPrice(all(4))).toBeCloseTo(recruitPrice(g) / 2, 9);
    // Mentors bring members in by themselves: 0.02 a second
    expect(step({ ...all(4), en: 1 }, 10, 0).mem).toBeCloseTo(10 + 0.2 - (7 * 10) / 900);
    // Socials halve how tired the club gets
    expect(1 - step(all(0), 10, 0).en).toBeCloseTo((1 - step(g, 10, 0).en) / 2);
  });
  it("a dot on the club tab while Avenue points are left", () => {
    const g = { ...club(0), mem: 12, stage: 5 };
    expect([news(g)[1], news({ ...g, pts: [4, 0, 0, 0, 0] })[1]]).toEqual([true, false]);
  });
  it("the Rotary family comes at FAM_AT earned, with the upgrades tab; its wheels shown at half their first price", () => {
    const g = club(0);
    expect([step({ ...g, all: FAM_AT - 0.001 }, 0, 0).stage, shownFam(g)]).toEqual([2, 0]);
    const x = step({ ...g, all: FAM_AT }, 0, 0);
    expect([x.stage, shownFam(x), shownFam({ ...x, all: FAM[1]! / 2 }), points(x)]).toEqual([3, 1, 2, 2]); // not a role: no point
    expect(buyFam({ ...g, h: 1e9 }, 0)).toEqual({ ...g, h: 1e9 }); // not shown yet
  });
  it("a family wheel costs FAM_UP times more each level; every level adds FAM_TURN to a turn and turns ours a little", () => {
    let g: Game = { ...club(FAM[0]!), stage: 3, all: FAM_AT };
    g = buyFam(g, 0);
    expect([g.fam[0], g.h, famPrice(g, 0), perTurn(g), idle(g)]).toEqual([
      1,
      0,
      near(FAM[0]! * FAM_UP),
      near(3 * TURN * (1 + FAM_TURN)),
      FAM_IDLE,
    ]);
    expect(buyFam(g, 0)).toBe(g); // the time does not reach
    expect(perTurn({ ...g, fam: fams(1, 0, 2, 0, 3) })).toBeCloseTo(3 * TURN * (1 + 6 * FAM_TURN), 12);
    // ten levels of a wheel: its turn doubled (a milestone)
    expect(perTurn({ ...g, fam: fams(10) })).toBeCloseTo(3 * TURN * (1 + 20 * FAM_TURN), 12);
    // it creeps first, the later wheels pull harder, and it spins at most IDLE_MAX
    expect([idle({ ...g, fam: fams(3, 2) }), idle({ ...g, fam: fams(1000) })]).toEqual([near(7 * FAM_IDLE), IDLE_MAX]);
  });
  it("Interact brings members, RYLA trains them, Inner Wheel refills the energy", () => {
    const g = { ...club(0), stage: 3 };
    // Interact's members graduate into ours, as long as it has some
    expect(step({ ...g, fam: fams(2), fm: fams(4) }, 10, 0).mem).toBeCloseTo(3.06);
    expect(step({ ...g, fam: fams(2), fm: fams(0.01) }, 10, 0).mem).toBeCloseTo(3.01);
    const t = { ...g, fam: fams(0, 5) };
    expect([trained(t), drain(t), trained({ ...g, fam: fams(0, 14) })]).toEqual([0.5, 0.75, 1]);
    // trained members make a turn bring up to twice as much (and the family's levels their FAM_TURN each)
    expect(perTurn(t)).toBeCloseTo(3 * TURN * 1.5 * (1 + 5 * FAM_TURN), 12);
    const w = { ...g, en: 0.5, fam: fams(0, 0, 1) };
    // it gives back at most four fifths of what was used, so an ignored club still folds
    expect(step(w, 10, 0).en).toBeCloseTo(0.5 - 0.2 * 10 * 2 * BASE);
    expect(step({ ...w, en: 1, fam: fams(0, 0, 50) }, 100, 0).en).toBeLessThan(1); // a big Inner Wheel only slows it
  });
  it("each family wheel has members: some with every level, more by themselves, and they flow along the pipeline", () => {
    const g = { ...club(1e9), mem: 12, stage: 5 };
    const b = buyFam({ ...g, all: FAM[4]! }, 4);
    expect(b.fm).toEqual(fams(0, 0, 0, 0, FLOW.give));
    // Rotary takes in ours who move on and feeds Inner Wheel and the Foundation; Interact and Rotary are past FLOW.cap a level, so
    // nobody joins them by themselves, while the new Inner Wheel and Foundation still grow
    const x = step({ ...g, fam: fams(1, 0, 1, 0, 1, 1), fm: fams(10, 0, 0, 0, 60) }, 10, 0);
    const move = (9 * 10) / 900;
    const grad = FLOW.grad * 10;
    const feed = 60 * FLOW.feed * 10;
    expect(x.fm).toEqual([
      near(10 - grad),
      0,
      near(FLOW.join * 10 + feed),
      0,
      near(60 + move - 2 * feed),
      near(FLOW.join * 10 + feed),
      0,
    ]);
    expect(x.moved).toEqual([near(grad), near(move), near(feed), near(feed)]);
    // without Rotary nobody moves on to it, without Inner Wheel or the Foundation nobody feeds them
    expect(step({ ...g, fam: fams(0, 0, 0, 0, 0), fm: fams(0, 0, 0, 0, 60) }, 10, 0).moved).toEqual([0, 0, 0, 0]);
    expect(PIPE).toHaveLength(x.moved.length);
  });
  it("a wheel far stronger than the one it drives slips now and then, and loses its pull on ours meanwhile", () => {
    const g = { ...club(0), stage: 5, fam: fams(3, 0, 10, 0, 3) };
    // Inner Wheel drives Rotary: 10 > 2 × 3 + 3; Interact and Rotary drive ours, which never makes them slip
    expect(MESH[2]).toBe(4);
    expect(FAM.map((_, i) => slipping(g, i))).toEqual([false, false, true, false, false, false, false]);
    expect(slipping({ ...g, fam: fams(3, 0, 10, 0, 4) }, 2)).toBe(false);
    // never while the one it drives has no level yet: there is nothing to raise
    expect(slipping({ ...g, fam: fams(0, 4) }, 1)).toBe(false);
    expect(slipping({ ...g, fam: fams(3, 0, 6) }, 2)).toBe(false);
    const rolls = fams(0, 0, 0.01, 0, 0);
    const s = slips(g, 0.1, rolls);
    expect(s.slip).toEqual(fams(0, 0, SLIP.secs));
    expect(slips(g, 0.1, fams(0, 0, 0.5)).slip).toEqual(fams()); // not this time
    expect(slips({ ...g, fam: fams(3, 0, 10, 0, 4) }, 0.1, rolls).slip).toEqual(fams()); // raised Rotary: no more
    // its help is lost while it slips, and comes back once it ran out
    expect(idle(s)).toBeCloseTo(idle(g) - 10 * 3 * FAM_IDLE * law(g).idle);
    expect(slips(s, 0.5, fams(1, 1, 1, 1, 1, 1, 1)).slip[2]).toBeCloseTo(SLIP.secs - 0.5);
    expect(idle(slips(s, SLIP.secs, fams(1, 1, 1, 1, 1, 1, 1)))).toBe(idle(g));
    // a slip going on when the game closed does not last the whole time away
    expect(away({ ...s, at: 0 }, 3600_000).slip).toEqual(fams());
    expect(away({ ...s, at: 0 }, 3600_000).h).toBeCloseTo(away({ ...g, at: 0 }, 3600_000).h);
  });
  it("the train: wheels mesh where they belong and turn against each other by their cogs", () => {
    expect([teeth(0), teeth(2), teeth(1e6)]).toEqual([7, 8, 16]);
    // Inner Wheel bought before Rotary: Rotary is drawn as a ghost it meshes with
    expect(drawn(fams(1, 0, 1))).toEqual([true, false, true, false, true, false, false]);
    const fm = fams(30, 2, 5, 1, 50, 3, 8);
    const at = (a: number) => train(fams(1, 1, 1, 1, 1, 1, 1), fm, a);
    const [now, later] = [at(0), at(1)];
    const ours = { i: -1, x: 0, y: 0, r: 57, t: 24, rot: 0, ghost: false };
    const find = (gs: Gear[], i: number) =>
      i < 0 ? { ...ours, rot: gs === later ? 360 : 0 } : gs.find((y) => y.i === i)!;
    expect(now.map((x) => x.i)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const x of now) {
      const q = find(now, MESH[x.i]!);
      // meshed: as far apart as their radii, and the radius by the cogs
      expect([Math.hypot(x.x - q.x, x.y - q.y), x.r / x.t]).toEqual([near(q.r + x.r), near(57 / 24)]);
      // our wheel a turn on: each wheel turns the other way, by the ratio of the cogs
      const turned = (gs: Gear[], i: number) => find(gs, i).rot - find(now, i).rot;
      expect(turned(later, x.i)).toBeCloseTo((-turned(later, q.i) * q.t) / x.t);
    }
    // youth to the left, Rotary to the right
    expect([find(now, 0).x < 0, find(now, 4).x > 0]).toEqual([true, true]);
  });
  it("the train never overlaps and fits the stage, whatever the members", () => {
    const sizes = [0, 2, 30, 1e6];
    for (let k = 0; k < 4 ** 7; k += 7) {
      const gs = train(fams(1, 1, 1, 1, 1, 1, 1), fams(...FAM.map((_, i) => sizes[Math.floor(k / 4 ** i) % 4]!)), 0);
      const all = [{ i: -1, x: 0, y: 0, r: 57 }, ...gs];
      const apart = all.flatMap((x) =>
        all
          .filter((y) => x.i < y.i && MESH[y.i] !== x.i && MESH[x.i] !== y.i)
          .map((y) => Math.hypot(x.x - y.x, x.y - y.y) - x.r - y.r - 7),
      );
      expect(Math.min(...apart)).toBeGreaterThan(0);
      const f = fit(gs);
      const out = gs.map((x) => Math.max(Math.abs(x.x - f.x), Math.abs(x.y - f.y)) + x.r + 3.5);
      expect(Math.max(...out) * f.s).toBeLessThanOrEqual(150);
    }
    expect(fit([]).s).toBe(1);
  });
  it("Rotex rings the bell about once a minute, more often by level; a talk lasts TALK.secs", () => {
    const g = { ...club(1e6), stage: 3, own: [1, 0, 0, 0, 0, 0, 0, 0] };
    expect([ring(g, 0.1, 0), ring({ ...g, fam: fams(0, 0, 0, 1) }, 0.1, 0.002)]).toEqual([false, true]);
    expect(ring({ ...g, fam: fams(0, 0, 0, 1) }, 0.1, 0.003)).toBe(false);
    expect(ring({ ...g, fam: fams(0, 0, 0, 2) }, 0.1, 0.003)).toBe(true);
    // Globetrotters make it ring up to twice as often
    const intl = { ...g, mem: 10, kind: [0, 0, 0, 10, 0], fam: fams(0, 0, 0, 1) };
    expect([ring(intl, 0.1, 0.003), ring(intl, 0.1, 0.0055)]).toEqual([true, false]);
    expect([perTurn(talk(g, 0)), runTime(talk(g, 1), 0), drain(talk(g, 2))]).toEqual([near(9 * TURN), 1.5, 0]);
    expect(step(talk(g, 2), 10, 0)).toMatchObject({ en: 1, talk: { k: 2, t: TALK.secs - 10 } });
    expect(step(talk(g, 0), TALK.secs, 0).talk).toBeNull();
    // after a talk is picked the bell keeps quiet for the talk and then its usual wait
    const r = { ...g, fam: fams(0, 0, 0, 2) };
    expect([bellEvery(g), bellEvery(r), bellQuiet(r)]).toEqual([Number.POSITIVE_INFINITY, 30, TALK.secs + 30]);
  });
  it("the bell's dock: a corner of the stage clear of every wheel, whatever the train, the members and the zoom", () => {
    const sizes = [0, 2, 30, 1e6];
    // the bell's radius: 24 px on the smallest stage, 290 px
    const bell = (24 * 300) / 290;
    let least = Number.POSITIVE_INFINITY;
    for (let on = 0; on < 128; on++) {
      if (!(on & 8)) continue; // the bell rings with Rotex only
      for (let k = 0; k < 4 ** 7; k += 97) {
        const gs = train(
          FAM.map((_, i) => (on >> i) & 1),
          fams(...FAM.map((_, i) => sizes[Math.floor(k / 4 ** i) % 4]!)),
          0,
        );
        for (const most of [1, 0.5]) least = Math.min(least, dock(gs, most)[1]);
      }
    }
    expect(least).toBeGreaterThan(bell);
    // our wheel alone: top right, and drawn where placed() puts it
    expect(dock([], 1)).toEqual([0, Math.hypot(DOCK, DOCK) - 60.5]);
    expect(placed([], 0.5)).toEqual({ s: 0.5, x: -0, y: -0 });
  });
  it("with the Rotary wheel, members who move on become mentors, each +1 % to everything earned", () => {
    const g = { ...club(0), mem: 12, stage: 5, own: [1, 0, 0, 0, 0, 0, 0, 0] };
    expect(step(g, 9, 0).alum).toBe(0);
    const x = step({ ...g, fam: fams(0, 0, 0, 0, 1) }, 9, 0);
    expect(x.alum).toBeCloseTo(0.09);
    const m = { ...g, alum: 10 };
    expect([mentors(m), perTurn(m), perRun(m, 0)]).toEqual([1.1, near(12 * TURN * 1.1), near(0.44)]);
  });
  it("a dot on the upgrades tab once a family wheel is affordable", () => {
    const g = { ...club(0), mem: 12, stage: 5, all: 1, pts: [4, 0, 0, 0, 0], grip: 30, oil: OIL_MAX };
    expect([news(g)[0], news({ ...g, h: FAM[0]! })[0]]).toEqual([false, true]);
    // Swipe and Hold too, once shown
    const w = { ...g, stage: 2, grip: 200, h: SPIN[1][1] };
    expect([news(w)[0], news({ ...w, all: SHOW.hold, spin: 1, h: SPIN[2][1] })[0], news({ ...w, spin: 1 })[0]]).toEqual(
      [true, true, false],
    );
  });
  it("the exchange opens after the Avenues with the Foundation wheel or at EX_AT earned", () => {
    const g = { ...club(0), mem: 12, stage: 5, pts: [4, 0, 0, 0, 0] };
    expect(step(g, 0.1, 0).stage).toBe(5);
    expect(step({ ...g, all: EX_AT }, 0.1, 0).stage).toBe(6);
    expect(step({ ...g, fam: fams(0, 0, 0, 0, 0, 1) }, 0.1, 0).stage).toBe(6);
    expect(step({ ...g, stage: 4, all: EX_AT }, 0.1, 0).stage).toBe(5); // one stage at a time
  });
  it("prices walk by the rolls: a middle roll is the drift a minute alone, less half the swing squared; 30 are kept", () => {
    const g = { ...club(0), mem: 10, stage: 6 };
    const mid = MARKET.vol.map(() => 0.5);
    expect(market({ ...g, stage: 5 }, 2, mid)).toEqual({ ...g, stage: 5 });
    const x = market(g, 2, mid);
    expect(x.px[0]![1]).toBeCloseTo(Math.exp((0.002 * 2) / 60 - 0.01 ** 2 / 2), 10);
    expect(price(market({ ...g, kind: [0, 0, 0, 10, 0] }, 2, mid), 0)).toBeCloseTo(
      Math.exp((0.005 * 2) / 60 - 0.01 ** 2 / 2),
      10,
    );
    // an hour of the safe club, without swings, grows by the drift alone: about 13 %, not a money printer
    let s = g;
    for (let k = 0; k < 1800; k++) s = market(s, 2, mid);
    expect(price(s, 0)).toBeCloseTo(Math.exp(0.12 - 1800 * 0.00005), 6);
    // a high roll lifts the wild club more than the safe one
    const hi = market(
      g,
      2,
      MARKET.vol.map(() => 1),
    );
    expect(price(hi, 4)).toBeGreaterThan(price(hi, 0));
    let y = g;
    for (let k = 0; k < 40; k++) y = market(y, 2, mid);
    expect(y.px[2]!.length).toBe(MARKET.keep);
  });
  it("buying takes a part of the time as shares; selling all pays today's price, the gain counted as earned", () => {
    const g = { ...club(1000), mem: 10, stage: 6 };
    expect(buyStock({ ...g, stage: 5 }, 0, 0.5)).toEqual({ ...g, stage: 5 });
    const b = buyStock(g, 1, 0.1);
    expect([b.h, b.sh[1], b.paid[1]]).toEqual([900, 100, 100]);
    const up = { ...b, px: b.px.map((h) => [...h, 2]) };
    expect(worth(up, 1)).toBe(200);
    const s = sellAll(up, 1);
    expect([s.h, s.all - b.all, s.sh[1], s.paid[1]]).toEqual([1100, 100, 0, 0]);
    // a loss gives back what is left, and takes nothing from what was earned
    const l = sellAll({ ...b, px: b.px.map((h) => [...h, 0.5]) }, 1);
    expect([l.h, l.all]).toEqual([950, b.all]);
    // a loss sold, or one still held, is won back before a gain counts: no earning by selling only what went up
    expect(sellAll({ ...l, sh: b.sh, paid: b.paid, px: up.px }, 1).all - l.all).toBe(50);
    const two = buyStock(buyStock(g, 0, 0.1), 1, 0.1);
    const mixed = { ...two, px: two.px.map((h, i) => [...h, i ? 1.5 : 0.5]) };
    const won = sellAll(mixed, 1);
    expect([won.all - two.all, sellAll(won, 0).all - two.all]).toEqual([0, 0]);
    // nothing held: Sell does nothing (it would count the others' rise as earned)
    expect(sellAll(up, 0)).toBe(up);
  });
  it("the Foundation takes a quarter, at most three at once, and gives it back with a gain after two minutes", () => {
    const g = { ...club(400), mem: 10, stage: 6 };
    const d = deposit(g);
    expect([d.h, d.dep]).toEqual([300, [{ n: 100, t: FUND.secs }]]);
    expect(deposit(deposit(deposit(d))).dep.length).toBe(3);
    expect(deposit(deposit(deposit(deposit(d))))).toEqual(deposit(deposit(deposit(d))));
    expect(fundBack({ ...g, fam: [0, 0, 0, 0, 0, 2, 0], kind: [0, 0, 0, 10, 0] })).toBeCloseTo(1.4);
    expect(fund(d, 60).dep[0]!.t).toBe(60);
    const back = fund(d, FUND.secs);
    expect([back.h, back.all - d.all, back.dep]).toEqual([420, expect.closeTo(20), []]);
    // it comes back through the steps too, and a dot asks for the exchange until something is in it
    expect(step(d, FUND.secs, 0).dep).toEqual([]);
    expect([news(g)[3], news(d)[3], news(buyStock(g, 0, 0.1))[3]]).toEqual([true, false, false]);
  });
  it("the district comes after the exchange with the Districts wheel, the year with the first club chartered", () => {
    const g = { ...club(0), mem: 12, stage: 6, pts: [4, 0, 0, 0, 0] };
    expect(step(g, 0.1, 0).stage).toBe(6);
    const d = step({ ...g, fam: [0, 0, 0, 0, 0, 0, 1] }, 0.1, 0);
    expect(d.stage).toBe(7);
    expect(step({ ...d, chart: 1 }, 0.1, 0).stage).toBe(8);
    expect(step({ ...g, stage: 5, fam: [0, 0, 0, 0, 0, 0, 1] }, 0.1, 0).stage).toBe(5); // one stage at a time
  });
  it("a club chartered costs CHARTER.price, CHARTER.up times that each time, and three members; CHARTER.per per Districts level", () => {
    const g = { ...club(10 * CHARTER.price), mem: 9, stage: 7, fam: [0, 0, 0, 0, 0, 0, 1] };
    expect([charterPrice(g), canCharter(g)]).toEqual([CHARTER.price, true]);
    const x = charter(g);
    expect([x.chart, x.mem, x.h, charterPrice(x)]).toEqual([1, 6, 9 * CHARTER.price, CHARTER.up * CHARTER.price]);
    expect(charter({ ...x, h: 0 })).toEqual({ ...x, h: 0 }); // the time does not reach
    expect(charter({ ...x, mem: 5 }).chart).toBe(1); // the founders stay
    const per = CHARTER.per;
    expect(charter({ ...x, chart: per, mem: 20, h: 1e12 }).chart).toBe(per); // CHARTER.per per level
    expect(charter({ ...x, chart: per, mem: 20, h: 1e12, fam: [0, 0, 0, 0, 0, 0, 2] }).chart).toBe(per + 1);
  });
  it("chartered clubs turn the wheel too, by the layer's reach; the layers bring the roles on", () => {
    const g = { ...club(0), mem: 10, fam: fams(0, 0, 10) };
    const own = 30 * FAM_IDLE;
    expect(idle(g)).toBeCloseTo(own);
    expect([layer({ ...g, chart: 2 }), idle({ ...g, chart: 2 })]).toEqual([
      0,
      expect.closeTo(own * (1 + CHARTER.turns * 2)),
    ]);
    expect([layer({ ...g, chart: 3 }), idle({ ...g, chart: 3 })]).toEqual([
      1,
      expect.closeTo(own * (1 + CHARTER.turns * 3 * 2)),
    ]);
    expect([layer({ ...g, chart: 10 }), layer({ ...g, chart: 30 })]).toEqual([2, 3]);
    // Member, Board with the projects, President with the Avenues, Rotarian after a handover, DRR, RI President; the layers
    // make no one DRR before the first handover (no role is skipped)
    expect([
      rank(g),
      rank({ ...g, stage: 4 }),
      rank({ ...g, stage: 5, mem: 3 }),
      rank({ ...g, years: 1 }),
      rank({ ...g, years: 1, chart: 3 }),
      rank({ ...g, years: 1, chart: 30 }),
      rank({ ...g, stage: 5, chart: 30 }),
    ]).toEqual([1, 2, 3, 4, 5, 7, 3]);
    // each new role one more Avenue point
    expect([points({ ...g, stage: 5 }), points({ ...g, stage: 5, years: 1, chart: 3 })]).toEqual([4, 6]);
  });
  it("the next role and how far it is: the time to join, members, people helped, chartered clubs; none at the top", () => {
    const g = club(0);
    const guest = fresh(0);
    expect(nextRole({ ...guest, all: SHOW.club / 2 })).toEqual([1, SHOW.club / 2, SHOW.club]);
    expect([nextRole(g), nextRole({ ...g, mem: 9, stage: 4 })]).toEqual([
      [2, 3, GATE.proj],
      [3, 9, GATE.av],
    ]);
    // President: the people helped toward the handover; more than the need counts as the need
    const pres = { ...g, mem: 12, stage: 5 };
    expect(nextRole({ ...pres, all: 0 })).toEqual([4, 0, HAND_AT]);
    expect(nextRole({ ...pres, all: 1e12 })).toEqual([4, HAND_AT, HAND_AT]);
    // Rotarian and up: the chartered clubs toward the next layer
    expect([
      nextRole({ ...g, years: 1, chart: 2 }),
      nextRole({ ...g, years: 1, chart: 12 }),
      nextRole({ ...g, years: 1, chart: 30 }),
    ]).toEqual([[5, 2, 3], [7, 12, 30], null]);
    expect(ROLE_NEED).toHaveLength(8);
  });
  it("the income rate eases toward what is earned, settling over a few seconds", () => {
    expect(ease(0, 10, 0)).toBe(0);
    expect(ease(0, 10, 3)).toBeCloseTo(10 * (1 - Math.exp(-1)));
    expect(ease(4, 4, 1)).toBe(4);
    // ten steps of 0.1 s come out as one of a second
    let r = 0;
    for (let i = 0; i < 10; i++) r = ease(r, 10, 0.1);
    expect(r).toBeCloseTo(ease(0, 10, 1));
    // earning stopped: 0 within some ten seconds, not a trail of ns/s for ever; a new year (less in all) at once
    let [x, top] = rateOn(0, 0, 10, 3);
    expect(x).toBeGreaterThan(0);
    let t = 0;
    for (; x > 0; t += 0.1) [x, top] = rateOn(x, top, 0, 0.1);
    expect(t).toBeGreaterThan(5);
    expect(t).toBeLessThan(12);
    expect(rateOn(7, 7, -3, 0.1)).toEqual([0, 0]);
  });
  it("the District conference: 100 turns in a minute double the time for five minutes, then a cooldown", () => {
    const g = { ...club(0), mem: 10, own: [1, 0, 0, 0, 0, 0, 0, 0], stage: 7 };
    expect(startConf(g)).toBe(g); // not before the District layer
    const c = startConf({ ...g, chart: 3 });
    expect([c.conf, c.cool, startConf(c)]).toEqual([{ t: 0, n: 0 }, CONF.cool, c]);
    const half = confer(c, 30, 60);
    expect(half.conf).toEqual({ t: 30, n: 60 });
    const won = confer(half, 1, 40);
    expect([won.conf, won.boost, gain(won), perTurn(won), perRun(won, 0)]).toEqual([
      null,
      CONF.boost,
      2,
      near(20 * TURN),
      0.8,
    ]);
    expect(confer(half, 30, 10)).toMatchObject({ conf: null, boost: 0 }); // too slow: nothing
    // the turns of the steps count, the boost and the cooldown run out
    expect(step(c, 1, 100).boost).toBe(CONF.boost);
    // only the player's own turns count: the family's turning alone does not win it
    expect(step(c, 1, 100, 0, false, 0)).toMatchObject({ boost: 0, conf: { n: 0 } });
    expect(confer({ ...won, cool: 5 }, CONF.boost, 0)).toMatchObject({ boost: 0, cool: 0 });
  });
  it("people helped grow with the square root of the time earned this year", () => {
    expect([
      helped(fresh(0)),
      helped({ ...club(0), all: 31_536_000 }),
      helped({ ...club(0), all: 3_153_600_000 }),
      helped({ ...club(0), all: 400 * 31_536_000 }),
    ]).toEqual([0, 2, 25, HAND_AT]);
  });
  it("a handover starts a new year, keeping helpers, chartered clubs, what they bought and the votes", () => {
    const g = { ...club(1e9), all: 400 * 31_536_000, mem: 30, stage: 8, chart: 4, helpers: 100, perm: [1, 0, 0, 0] };
    expect(handover({ ...g, all: 3_153_600_000 }, [0, 0, 0, 0])).toEqual({ ...g, all: 3_153_600_000 }); // under HAND_AT
    // 50 helped by the time earned, 4 by the chartered clubs
    const x = handover(g, [1, 0, 2, 3]);
    expect(x).toMatchObject({ h: 0, all: 0, mem: 4, stage: 8, chart: 4, helpers: 154, years: 1, ga: [1, 0, 2, 3] });
    expect(x.perm).toEqual([1, 0, 0, 0]);
    expect([rank(x), rank({ ...x, chart: 0 }), founders(250), gain(x)]).toEqual([5, 4, 5, 2.54]); // DRR, else Rotarian
    // a fold in the year gives half; before the district the game starts over from zero
    expect(refound({ ...g, folded: true })).toMatchObject({ helpers: 127, years: 0, chart: 4 });
    // folded, the role stays (no Guest, and no promotion when a new club is founded)
    expect([rank({ ...g, mem: 0, folded: true }), rank(refound({ ...g, mem: 0, folded: true }))]).toEqual([3, 3]);
    expect(refound({ ...club(0), folded: true, stage: 5 })).toEqual(fresh(0));
    expect(newYear(g, g.ga, 1).years).toBe(1);
    // a real event runs once, across years too; no handover before the year's stage
    expect([
      newYear({ ...g, evs: ["e1"] }, g.ga, 1).evs,
      refound({ ...club(0), folded: true, evs: ["e1"] }).evs,
    ]).toEqual([["e1"], ["e1"]]);
    expect(handover({ ...g, stage: 3 }, [0, 0, 0, 0])).toEqual({ ...g, stage: 3 });
  });
  it("helpers buy upgrades for good, each spent one losing its 1 %", () => {
    const g = { ...club(0), helpers: 100 };
    let x = buyPerm(g, 0);
    expect([x.helpers, x.perm[0], permPrice(x, 0), perTurn(x)]).toEqual([90, 1, 20, near(3 * TURN * 1.25 * 1.9)]);
    x = buyPerm({ ...x, helpers: 1000 }, 2);
    expect([x.perm[2], buyPerm(x, 2)]).toEqual([1, x]); // one level only
    expect(buyPerm({ ...g, helpers: 5 }, 0)).toEqual({ ...g, helpers: 5 });
    // Treasurer: four more hours away a level
    const t = { ...club(0), perm: [0, 1, 0, 0], fam: fams(0, 0, 1) };
    expect(away(t, 24 * 3_600_000).h).toBeCloseTo(AWAY * SPIN[0][0] * 12 * 3600 * 3 * TURN * (1 + FAM_TURN), 9);
    // Vice-president: a new project starts with a committee
    const v = buyProj({ ...club(1000), perm: [0, 0, 1, 0] }, 0);
    expect([v.com[0], v.run[0]]).toEqual([true, 0]);
    // Mentoring: an Avenue point a level
    expect(points({ ...club(0), perm: [0, 0, 0, 2] })).toBe(4);
  });
  it("the General Assembly's votes change the year: culture, rhythm, theme, twin club", () => {
    const g = { ...club(0), mem: 10, own: [1, 0, 0, 0, 0, 0, 0, 0], fam: fams(0, 0, 10) };
    const v = (ga: number[]) => ({ ...g, ga });
    expect(law(g)).toEqual({ dur: 1, drain: 1, talk: 1, turn: 1, join: 1, out: 1, idle: 1 });
    expect([runTime(v([0, -1, -1, -1]), 0), drain(v([0, -1, -1, -1]))]).toEqual([3.3000000000000003, 0.7]);
    expect([runTime(v([1, -1, -1, -1]), 0), drain(v([1, 0, -1, -1]))]).toEqual([2.4000000000000004, 1.3 * 1.3]);
    expect([talk(v([2, -1, -1, -1]), 0).talk!.t, perTurn(v([2, -1, -1, -1]))]).toEqual([
      2 * TALK.secs,
      near(10 * TURN * (1 + 20 * FAM_TURN) * 0.9),
    ]);
    expect(perRun(v([3, -1, -1, -1]), 0)).toBeCloseTo(0.36);
    expect([idle(v([-1, 0, -1, -1])), idle(v([-1, 1, -1, -1]))]).toEqual([
      expect.closeTo(30 * FAM_IDLE * 1.2),
      expect.closeTo(30 * FAM_IDLE * 0.85),
    ]);
    const k = { ...g, kind: [0, 0, 3, 0, 0] };
    expect([share(k, 2), share({ ...k, ga: [-1, -1, 2, -1] }, 2)]).toEqual([0.3, 0.6]);
    const mid = MARKET.vol.map(() => 0.5);
    expect(price(market({ ...g, stage: 6, ga: [-1, -1, -1, 1] }, 2, mid), 1)).toBeCloseTo(
      Math.exp((0.007 * 2) / 60 - 0.025 ** 2 / 2),
      10,
    );
  });
  it("dots on the district and year tabs: a club to charter or a conference, something for helpers", () => {
    const g = { ...club(2 * CHARTER.price), mem: 12, stage: 8, fam: [0, 0, 0, 0, 0, 0, 1], pts: [4, 0, 0, 0, 0] };
    expect(news(g).slice(4)).toEqual([true, false]);
    expect(news({ ...g, h: 0, helpers: 10 }).slice(4)).toEqual([false, true]);
    expect(news({ ...g, h: 0, chart: 3 })[4]).toBe(true); // the conference is ready
  });
  it("1291 on the keyboard opens it; three fingers that lift again do not; an old save is dropped", async () => {
    localStorage.setItem("rac.clicker", JSON.stringify({ v: 5, h: 5, f: 5, at: 0 }));
    render(<Oath />);
    act(() => {
      fireEvent.touchStart(window, { touches: [{}, {}, {}] });
      fireEvent.touchEnd(window, { touches: [{}, {}] });
    });
    expect(document.querySelector("dialog.clicker")).toBeNull();
    for (const k of "1291") fireEvent.keyDown(window, { key: k });
    await waitFor(() => expect(document.querySelector("dialog.clicker")).not.toBeNull());
    const score = () => document.querySelector(".clicker .score b")!.textContent;
    const zero = score();
    expect(zero).toMatch(/^0/);
    // at first only the wheel and Handshake: no club, no other upgrades
    expect([
      document.querySelectorAll(".clicker .up:not(.locked)").length,
      document.querySelector(".clicker .club"),
    ]).toEqual([1, null]);
    // no words on how to spin it: a pulsing hand on the wheel before the first tap, under it only what a turn brings
    expect([
      !!document.querySelector(".clicker .wheel .hand"),
      document.querySelector(".clicker p.hint")!.textContent,
    ]).toEqual([true, TEXT.turn.replace("{n}", fmt(TURN))]);
    // a tap-only wheel leaves a finger free to scroll the popup (touch-action none only once swiping is bought)
    expect(document.querySelector(".clicker .wheel")!.classList.contains("swipe")).toBe(false);
    fireEvent.pointerDown(document.querySelector(".clicker .wheel")!);
    fireEvent.pointerUp(document.querySelector(".clicker .wheel")!);
    await waitFor(() => expect(score()).not.toBe(zero), { timeout: 4000 });
    expect(document.querySelector(".clicker .wheel .hand")).toBeNull();
  });
  /** opens the game on save g */
  const open = async (g: Game) => {
    localStorage.setItem("rac.clicker", JSON.stringify({ ...g, at: Date.now() }));
    render(<Oath />);
    act(() => void dispatchEvent(new Event(OATH)));
    await waitFor(() => expect(document.querySelector("dialog.clicker")).not.toBeNull());
  };
  const tabs = () => document.querySelectorAll(".clicker .tabs button");
  it("with the club come two tabs, the upgrades' and the club's, under the wheel; the role shown once", async () => {
    await open(club(0));
    expect([tabs().length, tabs()[0]!.getAttribute("aria-pressed")]).toEqual([2, "true"]);
    expect([document.querySelector(".clicker .hands"), document.querySelectorAll(".clicker .rank").length]).toEqual([
      null,
      1,
    ]);
    // the upgrades in the first tab; no start over anywhere
    expect(document.querySelectorAll(".clicker .upgrades .up:not(.locked)").length).toBeGreaterThan(0);
    expect(document.querySelector(".clicker .reset")).toBeNull();
    fireEvent.click(tabs()[1]!);
    expect([
      document.querySelector(".clicker .club"),
      document.querySelector(".clicker .upgrades"),
      document.querySelector(".clicker .wheel"),
    ]).toEqual([expect.anything(), null, expect.anything()]);
  });
  it("the role badge: a bar toward the next role; tapped, the ladder of all eight roles; Escape closes it, not the game", async () => {
    await open({ ...club(0), mem: 4, stage: 3 });
    const badge = () => document.querySelector<HTMLButtonElement>(".clicker button.rank")!;
    expect(badge().querySelector<HTMLElement>(".toward")!.style.getPropertyValue("--k")).toBe(`${4 / GATE.proj}`);
    expect(badge().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(badge());
    const rows = [...document.querySelectorAll(".clicker .ladder li")];
    expect([badge().getAttribute("aria-expanded"), rows.length]).toEqual(["true", 8]);
    // reached, yours, the next with what it takes and how far, what each brings
    expect(rows.map((r) => r.className)).toEqual(["got", "got", "ahead", "ahead", "ahead", "ahead", "ahead", "ahead"]);
    expect(rows[1]!.getAttribute("aria-current")).toBe("step");
    expect(rows[2]!.querySelector("small")!.textContent).toBe(TEXT.ladder.how[2]!.replace("{n}", `${GATE.proj}`));
    expect([rows[2]!.querySelector("progress")!.getAttribute("value"), rows[3]!.querySelector("progress")]).toEqual([
      "4",
      null,
    ]);
    expect(rows[3]!.querySelector("em")!.textContent).toBe(TEXT.perks[3]);
    fireEvent.keyDown(badge(), { key: "Escape" });
    expect([document.querySelector(".clicker .ladder"), document.querySelector("dialog.clicker")]).toEqual([
      null,
      expect.anything(),
    ]);
    // a tap outside closes it too
    fireEvent.click(badge());
    fireEvent.pointerDown(document.querySelector(".clicker .wheel")!);
    expect(document.querySelector(".clicker .ladder")).toBeNull();
  });
  it("under the score, what is earned a second once the wheel turns", async () => {
    await open({ ...club(0), mem: 4, stage: 3 });
    expect(document.querySelector(".clicker .score .rate")).toBeNull();
    fireEvent.pointerDown(document.querySelector(".clicker .wheel")!);
    fireEvent.pointerUp(document.querySelector(".clicker .wheel")!);
    await waitFor(() => expect(document.querySelector(".clicker .score .rate")!.textContent).toMatch(/^· \+.+\/s$/), {
      timeout: 4000,
    });
  });
  it("×1 / ×10 / ×Max over the upgrades: the price of the amount chosen, ×Max with its count, the next milestone", async () => {
    // its place is kept before it matters
    await open({ ...club(0), h: series(GRIP[0], GRIP[1], 7) });
    expect(document.querySelector(".clicker .upgrades .bulk")!.classList.contains("off")).toBe(true);
    cleanup();
    await open({ ...club(0), stage: 3, h: series(GRIP[0], GRIP[1], 7) });
    expect(document.querySelector(".clicker .upgrades .bulk")!.classList.contains("off")).toBe(false);
    const grip = () => document.querySelector(".clicker .upgrades .up")!;
    expect([grip().querySelector("em")!.textContent, grip().querySelector("small")!.textContent]).toEqual([
      `${fmt(GRIP[0])} ⏱️`,
      expect.stringContaining(TEXT.upMile.replace("{n}", "10")),
    ]);
    const bulk = [...document.querySelectorAll(".clicker .upgrades .bulk button")];
    fireEvent.click(bulk[2]!);
    expect([bulk[2]!.getAttribute("aria-pressed"), grip().querySelector("em .many")!.textContent]).toEqual([
      "true",
      "×7",
    ]);
    expect(grip().querySelector("em")!.textContent).toContain(fmt(series(GRIP[0], GRIP[1], 7)));
    fireEvent.click(grip());
    await waitFor(() => expect(grip().querySelector("strong")!.textContent).toBe("7"));
  });
  it("at stage 3 the family's wheels join the upgrades, drawn as cogs, after the wheel's own; no new tab", async () => {
    await open({ ...club(0), stage: 3, all: FAM[1]! / 2 });
    expect(tabs().length).toBe(2);
    const ups = [...document.querySelectorAll(".clicker .upgrades .up")];
    expect([
      ups.length,
      ups.findIndex((u) => u.querySelector(".cog-card")),
      ups.at(-1)!.classList.contains("locked"),
    ]).toEqual(
      [6, 3, true], // Handshake, Momentum, Swipe, Interact, RYLA, then the 🔒 of Hold
    );
  });
  it("at GATE.proj members the projects get their own tab", async () => {
    await open({ ...club(0), mem: 6, stage: 4, all: 500 });
    expect(tabs().length).toBe(3);
    fireEvent.click(tabs()[2]!);
    expect([document.querySelector(".clicker .wheel"), document.querySelectorAll(".clicker .proj").length]).toEqual([
      expect.anything(),
      2,
    ]);
  });
  it("a project card holds its buttons: buy, run (or why not), the committee, then its Auto switch", async () => {
    await open({ ...club(1000), mem: 6, stage: 4, all: 500 });
    fireEvent.click(tabs()[2]!);
    const card = () => document.querySelector(".clicker .proj")!;
    expect([card().querySelector(".go")!.getAttribute("aria-disabled"), card().querySelector(".why")]).toEqual([
      "true",
      expect.anything(),
    ]);
    fireEvent.click(card().querySelector(".buy")!);
    await waitFor(() => expect(card().querySelector("strong")!.textContent).toBe("×1"));
    expect([card().querySelector(".go")!.getAttribute("aria-disabled"), card().querySelector(".why")]).toEqual([
      "false",
      null,
    ]);
    fireEvent.click(card().querySelectorAll(".buy")[1]!);
    await waitFor(() => expect(card().querySelector(".switch")!.getAttribute("aria-checked")).toBe("true"));
    fireEvent.click(card().querySelector(".switch")!);
    await waitFor(() => expect(card().querySelector(".switch")!.getAttribute("aria-checked")).toBe("false"));
    // the Social committee in the Club tab, with its own switch once bought
    fireEvent.click(tabs()[1]!);
    fireEvent.click([...document.querySelectorAll(".clicker .club .up")].at(-1)!);
    await waitFor(() => expect(document.querySelector(".clicker .club > .switch")).not.toBeNull());
  });
  it("at GATE.av members the Club tab shows the Avenues, a slider each, and no new tab", async () => {
    await open({ ...club(0), mem: 12, stage: 5, all: 500 });
    expect(tabs().length).toBe(3);
    fireEvent.click(tabs()[1]!);
    const sliders = document.querySelectorAll<HTMLInputElement>(".clicker .avenues input[type=range]");
    expect(sliders.length).toBe(5);
    fireEvent.change(sliders[2]!, { target: { value: "3" } });
    await waitFor(() => expect(document.querySelectorAll(".clicker .av strong")[2]!.textContent).toBe("3"));
  });
  it("at the exchange its tab shows five clubs, a buy makes a holding to sell", async () => {
    await open({ ...club(1000), mem: 12, stage: 6, all: EX_AT, pts: [4, 0, 0, 0, 0] });
    expect(tabs().length).toBe(4);
    fireEvent.click(tabs()[3]!);
    expect(document.querySelectorAll(".clicker .stock:not(.fund)").length).toBe(5);
    // from the start: the price and a line, the 🌶️ explained, buttons saying what they put in
    const stock = () => document.querySelector(".clicker .stock")!;
    expect([
      stock().querySelector(".px")!.textContent,
      stock().querySelector(".spark polyline")!.getAttribute("points")!.split(" ").length,
      document.querySelector(".clicker .exchange .risk")!.textContent,
      stock().querySelector(".buy")!.textContent,
    ]).toEqual([
      `${TEXT.px} ×1.00 +0.0 %`,
      MARKET.keep,
      TEXT.risk,
      `${TEXT.invest.replace("{p} ", "10\u00a0")} · ${fmt(100)}`,
    ]);
    expect(spanned([2, 3])).toEqual([...Array(MARKET.keep - 1).fill(2), 3]);
    // the holding's line and Sell keep their place before anything is held, so a buy moves nothing below
    const held = () => stock().querySelector(".held")!;
    expect([held().classList.contains("none"), stock().querySelector(".sell")!.getAttribute("aria-disabled")]).toEqual([
      true,
      "true",
    ]);
    fireEvent.click(document.querySelector(".clicker .stock .buy")!);
    await waitFor(() => expect(held().classList.contains("none")).toBe(false));
    expect(document.querySelector(".clicker .held")!.textContent).toBe(
      `${TEXT.held.replace("{n}", fmt(100))}+${fmt(0)} (+0.0 %)`,
    );
    fireEvent.click(document.querySelector(".clicker .sell")!);
    await waitFor(() => expect(held().classList.contains("none")).toBe(true));
  });
  it("the district and year tabs: charter a club, vote, and hand over; start over only at the year's bottom", async () => {
    await open({
      ...club(2 * CHARTER.price),
      mem: 12,
      stage: 8,
      all: 400 * 31_536_000,
      fam: fams(0, 0, 0, 0, 0, 0, 1),
      pts: [4, 0, 0, 0, 0],
    });
    expect(tabs().length).toBe(6);
    fireEvent.click(tabs()[4]!);
    fireEvent.click(document.querySelector(".clicker .district .up")!);
    await waitFor(() => expect(document.querySelectorAll(".clicker .district .chips li").length).toBe(1));
    fireEvent.click(tabs()[5]!);
    // 50 helped by the time earned, one by the club just chartered
    expect(document.querySelector(".clicker .year .heart b")!.textContent).toContain(`${HAND_AT + 1}`);
    expect(document.querySelector(".clicker .year > :last-child")!.classList.contains("reset")).toBe(true);
    // this year's votes as a summary: none yet
    expect(document.querySelectorAll(".clicker .ga-now li").length).toBe(4);
    expect(document.querySelector(".clicker .ga-now b")!.textContent).toBe("—");
    // Hand over opens the ceremony over the game; Escape closes it again, the game still open
    const hand = () => document.querySelector<HTMLElement>(".clicker .year .hand")!;
    fireEvent.click(hand());
    const cer = () => document.querySelector(".clicker .ceremony");
    expect(cer()!.querySelectorAll(".cer-tiles li").length).toBe(6);
    expect(document.activeElement).toBe(cer()!.querySelector("h3"));
    expect(document.querySelector(".clicker .game")!.hasAttribute("inert")).toBe(true);
    fireEvent.keyDown(cer()!, { key: "Escape" });
    expect([cer(), !!document.querySelector(".clicker .year")]).toEqual([null, true]);
    expect(document.querySelector(".clicker .game")!.hasAttribute("inert")).toBe(false);
    // Escape with the focus on nothing reaches the popup's dialog: it closes the ceremony, not the game
    fireEvent.click(hand());
    expect(document.querySelector(".clicker .obhead")!.hasAttribute("inert")).toBe(true);
    const esc = new Event("cancel", { cancelable: true });
    act(() => void document.querySelector("dialog.clicker")!.dispatchEvent(esc));
    expect([esc.defaultPrevented, cer(), !!document.querySelector("dialog.clicker")]).toEqual([true, null, true]);
    expect(document.querySelector(".clicker .obhead")!.hasAttribute("inert")).toBe(false);
    // through it: the review, the General Assembly (preset to the first choices, each saying what it does), what next year brings
    hand().focus();
    fireEvent.click(hand());
    fireEvent.click(cer()!.querySelector(".cer-go")!);
    const chips = () => cer()!.querySelectorAll(".motion .vote");
    expect([...chips()].filter((c) => c.getAttribute("aria-pressed") === "true").length).toBe(4);
    expect(chips()[0]!.querySelector("small")!.textContent).toBe("run time +10 % · tiredness −30 %");
    fireEvent.click(chips()[1]!); // Zürich
    expect([chips()[0]!.getAttribute("aria-pressed"), chips()[1]!.getAttribute("aria-pressed")]).toEqual([
      "false",
      "true",
    ]);
    // Skip moves on with the picks as they are
    fireEvent.click(cer()!.querySelector(".cer-row .link")!);
    expect(cer()!.querySelector(".cer-big")!.textContent).toMatch(/×1\.\d+/);
    fireEvent.click(cer()!.querySelector(".cer-go")!);
    // the chain passes on: no closing any more; at its end the new year, on the upgrades, with a welcome
    expect(cer()!.querySelector(".cer-x")).toBeNull();
    fireEvent.animationEnd(cer()!.querySelector(".chain .links")!);
    await waitFor(() => expect(cer()).toBeNull());
    expect(tabs()[0]!.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".clicker .toast")!.textContent).toBe("Year 2 — welcome back, Rotarian");
    // the ceremony was the celebration: no promotion card on top; the focus on the wheel, not lost
    expect(document.querySelector(".clicker .promo")).toBeNull();
    expect(document.activeElement).toBe(document.querySelector(".clicker .wheel"));
    expect(document.querySelector(".clicker .rank b")!.textContent).toContain("Rotarian");
    fireEvent.click(tabs()[5]!);
    expect(document.querySelector(".clicker .year .heart b")!.textContent).toContain("1"); // the chartered club helps from the start;
    expect(document.querySelector(".clicker .ga-now b")!.textContent).toBe("Zürich");
  });
  it("after time away a welcome-back card over the game tells what happened; the time is in already, Collect closes it", async () => {
    const g = { ...club(0), fam: fams(2, 0, 1) };
    localStorage.setItem("rac.clicker", JSON.stringify({ ...g, at: Date.now() - 2 * 3_600_000 }));
    render(<Oath />);
    act(() => void dispatchEvent(new Event(OATH)));
    const card = () => document.querySelector<HTMLElement>(".clicker .ceremony");
    await waitFor(() => expect(card()).not.toBeNull());
    expect(card()!.getAttribute("aria-label")).toBe("While you were away");
    expect(card()!.querySelectorAll(".cer-tiles li").length).toBe(4);
    expect(card()!.querySelector(".cer-tiles b")!.textContent).toBe(fmt(7200));
    expect(document.querySelector(".clicker .game")!.hasAttribute("inert")).toBe(true);
    const go = card()!.querySelector<HTMLButtonElement>(".cer-go")!;
    await waitFor(() => expect(document.activeElement).toBe(go));
    // closed without collecting: the time away is kept all the same
    cleanup();
    expect(JSON.parse(localStorage.getItem("rac.clicker")!).h).toBeGreaterThan(0);
    // opened again a moment later: no card; and Collect closes one
    render(<Oath />);
    act(() => void dispatchEvent(new Event(OATH)));
    await waitFor(() => expect(document.querySelector("dialog.clicker")).not.toBeNull());
    expect(card()).toBeNull();
    cleanup();
    localStorage.setItem("rac.clicker", JSON.stringify({ ...g, at: Date.now() - 2 * 3_600_000 }));
    render(<Oath />);
    act(() => void dispatchEvent(new Event(OATH)));
    await waitFor(() => expect(card()).not.toBeNull());
    expect(document.getElementById(card()!.getAttribute("aria-describedby")!)!.textContent).toContain(fmt(7200));
    fireEvent.click(card()!.querySelector(".cer-go")!);
    expect(card()).toBeNull();
    expect(document.querySelector(".clicker .game")!.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(document.querySelector(".clicker .wheel"));
  });
  it("a founded club shows its members and energy; a folded one offers a new start", async () => {
    await open(club(0));
    fireEvent.click(tabs()[1]!);
    expect(document.querySelector(".clicker [role=meter]")!.getAttribute("aria-valuenow")).toBe("100");
    cleanup();
    await open({ ...club(0), mem: 0, folded: true });
    expect(document.querySelector(".clicker .folded")).not.toBeNull();
    fireEvent.click(document.querySelector(".clicker .folded button")!);
    expect(document.querySelector(".clicker .folded")).toBeNull();
  });
  it("the music: four chords as an arpeggio over a bass on the beats, a bit louder with the stage; ticks rise with speed", () => {
    expect(hz(69)).toBe(440);
    expect(notesAt(0)).toEqual({ arp: hz(72), bass: hz(48) });
    expect([notesAt(1).bass, notesAt(3).arp, notesAt(4).bass]).toEqual([null, hz(84), hz(36)]);
    expect(notesAt(8).arp).toBe(hz(79)); // the second chord, G
    expect(notesAt(32)).toEqual(notesAt(0)); // the loop: four bars
    expect(musicVol(8)).toBeGreaterThan(musicVol(1));
    expect(musicVol(20)).toBe(musicVol(8));
    expect(tickHz(3)).toBeGreaterThan(tickHz(0));
  });
  it("without Web Audio (jsdom) every sound is silent and nothing throws", () => {
    expect(() => {
      unlock();
      play("bling");
      play("tick", 3);
      music(true, 3);
      music(false, 3);
      hush();
    }).not.toThrow();
  });
  it("the sounds of what happens: folding, a stage or role, a new card, low energy", () => {
    const m = { big: 3, small: 2, low: false, folded: false };
    expect([
      cue(m, m),
      cue(m, { ...m, folded: true }),
      cue(m, { ...m, big: 4, small: 3 }),
      cue(m, { ...m, small: 3 }),
      cue(m, { ...m, low: true }),
      cue({ ...m, low: true }, { ...m, low: true }),
      cue(m, { ...m, big: 0, small: 0 }), // a new year: nothing
    ]).toEqual([null, "sad", "fanfare", "unlock", "warn", null, null]);
  });
  it("the sound and music switches sit in the top bar, on at first, and are kept in the save", async () => {
    await open(club(0));
    const [sfx, mus] = document.querySelectorAll(".clicker .snd button");
    expect([sfx!.getAttribute("aria-pressed"), mus!.getAttribute("aria-pressed")]).toEqual(["true", "true"]);
    fireEvent.click(mus!);
    await waitFor(() => expect(mus!.getAttribute("aria-pressed")).toBe("false"));
    cleanup();
    expect(JSON.parse(localStorage.getItem("rac.clicker")!)).toMatchObject({ sfx: true, music: false });
    expect(refound({ ...club(0), music: false, folded: true }).music).toBe(false);
  });
});
