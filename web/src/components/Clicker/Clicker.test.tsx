// The idle clicker's sums, and the oath that opens it.
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  award,
  away,
  buyFam,
  buySlot,
  buySpin,
  buyTree,
  chance,
  charter,
  design,
  donate,
  dur,
  faster,
  free,
  fresh,
  handover,
  idle,
  judge,
  layer,
  officer,
  perTurn,
  phfFree,
  pinsFor,
  rest,
  room,
  runs,
  sponsor,
  stake,
  start,
  step,
  talk,
  toCamp,
  type Plan,
} from "./Clicker";
import { OATH, Oath } from "./Oath";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe("Clicker", () => {
  // a bake sale for education, for families, with the budget families want of it: everything fits
  const bake: Plan = { c: 4, fm: 0, a: 1, z: 0, b: [1, 7, 2] };
  // homework help: a small workshop for education, for students
  const help: Plan = { c: 4, fm: 5, a: 0, z: 0, b: [4, 1, 5] };
  it("a plan is judged by cause, audience, season and budget, and the review names the weakest", () => {
    expect(judge(bake, 0)).toEqual({ st: 5, weak: -1, want: 0 });
    expect(judge({ ...bake, c: 2 }, 0)).toMatchObject({ st: 4, weak: 0 }); // nobody bakes for water
    expect(judge({ ...bake, a: 2 }, 0)).toMatchObject({ weak: 1 }); // alumni do not come
    expect(judge({ ...bake, b: [7, 1, 2] }, 0)).toEqual({ st: 3, weak: 3, want: 1 }); // the food is what is short
    // a charity run for health, for students: fine in June, the wrong time in January
    const run: Plan = { c: 1, fm: 2, a: 0, z: 0, b: [2, 2, 6] };
    expect([judge(run, 5), judge(run, 0)]).toEqual([
      { st: 5, weak: -1, want: 0 },
      { st: 4, weak: 2, want: 0 },
    ]);
    // a gala's season runs over the new year
    expect([9, 0, 2, 5].map((m) => judge({ c: 0, fm: 3, a: 3, z: 0, b: [6, 4, 0] }, m).weak)).toEqual([-1, -1, -1, 2]);
  });
  it("designing costs the size's fee, fills the slot and the recipe book; stars scale what a run brings", () => {
    let g = design(fresh(0), 0, bake, 0);
    expect([g.proj[0]!.st, runs(g.proj[0]!, g), g.book]).toEqual([
      5,
      { h: 10, f: 0, need: 1, out: 18, ppl: 0 },
      ["4.0.1.0.1.7.2.5"],
    ]);
    expect(design(g, 1, { ...bake, z: 1 }, 0)).toBe(g); // a medium one costs 150
    expect(design(g, 1, { ...bake, b: [1, 7, 1] }, 0)).toBe(g); // a point unspent
    expect(design(g, 5, bake, 0)).toBe(g); // no such slot
    expect(buySlot(g)).toBe(g);
    expect(buySlot({ ...g, f: 400 }).proj.length).toBe(3);
    // the same plan again replaces its line; a worse one comes on top; a redesign starts from level 0 but keeps the officer
    g = officer(faster({ ...g, f: 200 }, 0), 0);
    g = design(design(g, 0, bake, 0), 0, { ...bake, c: 2 }, 0);
    expect(g.book).toEqual(["2.0.1.0.1.7.2.4", "4.0.1.0.1.7.2.5"]);
    expect([g.proj[0]!.lv, g.proj[0]!.auto, runs(g.proj[0]!, g).out]).toEqual([0, true, 12]);
  });
  it("turns earn hours, a fundraiser turns hours into francs when its bar is full", () => {
    let g = design(fresh(0), 0, bake, 0);
    expect(start(g, 0)).toBe(g); // no hours yet
    expect(start(g, 1)).toBe(g); // nothing in that slot
    g = step(g, 1, 4); // four turns at three hours
    expect(g.h).toBe(12);
    g = start(g, 0);
    expect([g.h, g.proj[0]!.t]).toEqual([2, 0]);
    expect(start(g, 0)).toBe(g); // already running
    g = step(g, 4.9, 0);
    expect(g.f).toBe(0);
    g = step(g, 0.2, 0);
    expect([g.f, g.proj[0]!.t]).toEqual([18, -1]);
  });
  it("service spends hours and francs on people; a level makes a project faster, not bigger", () => {
    let g = design({ ...fresh(0), h: 100, f: 100 }, 1, help, 0);
    expect([g.proj[1]!.st, dur(g.proj[1]!, g)]).toEqual([5, 5]);
    g = step(start(g, 1), 5, 0);
    expect([g.h, g.f, g.p]).toEqual([90, 85, 4]);
    g = faster(g, 1);
    expect([g.f, dur(g.proj[1]!, g)]).toEqual([80, 4]);
    expect(faster({ ...g, f: 0 }, 1).proj[1]!.lv).toBe(1); // nothing to pay with
  });
  it("an officer starts a project again as long as the hours last, also many times in one step", () => {
    let g = officer(design({ ...fresh(0), h: 35, f: 100 }, 0, bake, 0), 0);
    expect([g.f, g.proj[0]!.auto]).toEqual([0, true]);
    g = step(g, 0.1, 0); // starts by itself
    expect([g.h, g.proj[0]!.t]).toEqual([25, 0]);
    g = step(g, 60, 0); // three runs paid for, then it waits for hours
    expect([g.h, g.f, g.proj[0]!.t]).toEqual([5, 54, -1]);
  });
  it("a run needs a team, which is tired afterwards and recovers; Inner Wheel shortens that", () => {
    let g = design({ ...fresh(0), h: 1000, f: 1000 }, 0, bake, 0);
    g = design(g, 1, { ...bake, z: 1 }, 0); // a medium one needs three
    expect(free(g)).toBe(3);
    g = start(g, 0);
    expect([free(g), start(g, 1)]).toEqual([2, g]); // two left: not enough for three
    g = step(g, 5, 0);
    expect([g.tired, g.proj[0]!.t]).toEqual([1, -1]); // back from the run, tired
    expect(start(g, 1)).toBe(g);
    g = step(g, 6, 0);
    expect(g.tired).toBeCloseTo(Math.exp(-1));
    expect(start(step(g, 30, 0), 1).proj[1]!.t).toBe(0);
    expect([rest(g), rest({ ...g, fam: [0, 0, 0, 2, 0, 0, 0] })]).toEqual([6, 2]);
  });
  it("members join while there is room, turn 30 and go to Rotary, which then pays part of the service", () => {
    let g = step(fresh(0), 20, 0);
    expect([g.mem, room(g), room({ ...g, fam: [2, 0, 0, 0, 0, 0, 0] })]).toEqual([4, 6, 18]);
    g = step({ ...fresh(0), mem: 6 }, 100, 0); // full: who leaves is replaced, and without Rotary's wheel is just gone
    expect([g.mem, g.alum]).toEqual([6, 0]);
    g = step({ ...fresh(0), mem: 6, fam: [0, 0, 0, 0, 2, 0, 0], alum: 4.7 }, 90, 0);
    expect(g.alum).toBeCloseTo(5);
    expect(sponsor(g)).toBeCloseTo(0.15);
    const pr = design({ ...g, f: 100 }, 0, help, 0).proj[0]!;
    expect(runs(pr, g).f).toBe(13); // 15 francs less 15 %
    expect(sponsor({ ...g, alum: 500 })).toBe(0.75);
  });
  it("RYLA takes members away for a minute and sends them back trained; a talk lasts 45 seconds", () => {
    let g = { ...fresh(0), mem: 5, fam: [0, 2, 0, 0, 0, 0, 0] };
    expect(toCamp(fresh(0))).toEqual(fresh(0)); // no RYLA wheel
    g = toCamp(g);
    expect([g.mem, g.camp, free(g), toCamp(g)]).toEqual([3, 2, 3, g]);
    g = step(step(g, 59, 0), 2, 0);
    expect([Math.floor(g.mem), g.pro, g.camp, free(g)]).toEqual([6, 2, 0, 8]);
    g = talk(fresh(0), 0);
    expect([perTurn(g), perTurn(step(g, 44, 0)), perTurn(step(g, 46, 0))]).toEqual([9, 9, 3]);
    g = step(start(talk(design({ ...fresh(0), h: 10 }, 0, bake, 0), 2), 0), 5, 0);
    expect([g.tired, g.f]).toEqual([0, 18]); // nobody gets tired
    expect(runs(g.proj[0]!, talk(g, 1)).out).toBe(36);
  });
  it("the family adds to every turn and keeps the wheel turning; swipe and hold are bought in order", () => {
    let g = buyFam({ ...fresh(0), f: 5200 }, 0);
    expect([g.f, g.fam[0], perTurn(g), idle(g)]).toEqual([5160, 1, 5, 0.08]);
    g = buySpin(buySpin(buySpin(g)));
    expect([g.spin, g.f]).toEqual([2, 10]);
  });
  it("a closed app counts the idle wheel for at most eight hours", () => {
    const g = buyFam({ ...fresh(0), f: 40 }, 0);
    expect(away(g, 30 * 864e5).h).toBeCloseTo(8 * 3600 * 0.08 * 5);
    expect(away(fresh(0), 30 * 864e5).h).toBe(0);
  });
  it("a handover keeps what lasts and gives points; the tree, the culture and the banners count", () => {
    expect(handover(fresh(0), 1, 0)).toEqual(fresh(0)); // nobody helped, nothing to hand over
    const g = step({ ...design(fresh(0), 0, bake, 0), p: 800, h: 5, pins: 1, given: 50 }, 0.1, 0);
    expect(g.ban).toEqual([0, 1, 4]); // first project, five stars, 100 people
    let next = handover(g, 1, 0);
    expect([pinsFor(g), next.pins, next.h, next.p, next.proj, next.book]).toEqual([2, 3, 0, 0, [null, null], g.book]);
    expect([next.best, next.yrs, next.cult, next.given, next.ban]).toEqual([800, 1, 0, 50, [0, 1, 4]]);
    expect(perTurn(next)).toBeCloseTo(3 * 1.06); // three banners
    // Bern: bars a tenth slower, half the rest
    expect([dur(design(next, 0, bake, 0).proj[0]!, next), rest(next)]).toEqual([5.5, 3]);
    // experience costs one point, then two; the committee's slot and the vice-president's officers come with the next year
    next = buyTree(buyTree(buyTree(next, 0), 0), 0);
    expect([next.tree[0], next.pins]).toEqual([2, 0]);
    expect(perTurn(next)).toBeCloseTo(3 * 1.06 * 1.5);
    next = { ...next, pins: 2, p: 100 };
    next = handover(buyTree(buyTree(next, 2), 3), 2, 1);
    expect([next.proj.length, design(next, 0, bake, 0).proj[0]!.auto, next.yrs]).toEqual([3, true, 2]);
    expect(buyTree({ ...next, pins: 9 }, 2).tree[2]).toBe(1); // the vice-president has one level
  });
  it("the Foundation gives a donation back with a quarter on top; what was given earns Paul Harris pins", () => {
    let g = donate({ ...fresh(0), f: 2000 }, 1000);
    expect([g.f, g.given, phfFree(g), donate(g, 5000)]).toEqual([1000, 1000, 1, g]);
    g = step(g, 119, 0);
    expect(g.f).toBe(1000);
    g = step(g, 2, 0);
    expect([g.f, g.grants]).toEqual([2250, []]);
    expect(award(g, 0)).toBe(g); // no Interact wheel to pin it on
    g = award({ ...g, fam: [1, 0, 0, 0, 0, 1, 0] }, 0);
    expect([phfFree(g), perTurn(g), award(g, 0)]).toEqual([0, 3 + 4 + 5000, g]);
    expect(step(donate(g, 100), 121, 0).f).toBe(2150 + 150); // the Foundation's wheel: half on top
    expect(phfFree({ ...g, given: 1e5 })).toBe(2);
  });
  it("a stake is a quarter of the francs: back as a multiple if the project works, gone if not", () => {
    const g = { ...fresh(0), f: 400 };
    expect(stake({ ...g, f: 30 }, 0, "Bern", true)).toEqual({ ...g, f: 30 }); // under ten francs
    const on = stake(g, 3, "Bern", true);
    expect([on.f, on.stake, stake(on, 0, "Basel", true)]).toEqual([
      300,
      { club: "Bern", k: 3, amt: 100, win: true, t: 30 },
      on,
    ]);
    expect(step(on, 29, 0).f).toBe(300);
    expect([step(on, 31, 0).f, step(on, 31, 0).res, step(on, 31, 0).stake]).toEqual([1000, 600, null]);
    const off = step(stake(g, 3, "Bern", false), 31, 0);
    expect([off.f, off.res]).toEqual([300, -100]);
    const nose = { ...g, tree: [0, 0, 0, 0, 3] };
    expect([chance(g, 3), chance(nose, 3), chance(nose, 0)].map((n) => Math.round(n * 100))).toEqual([20, 35, 95]);
  });
  it("chartered clubs help the best year's people in an hour, more as a district grows into a country", () => {
    let g = { ...fresh(0), f: 2e6, best: 3600 };
    expect(charter(g, "Bern")).toBe(g); // no Districts wheel
    g = charter(charter({ ...g, fam: [0, 0, 0, 0, 0, 0, 1] }, "Bern"), "Basel");
    expect([g.clubs, g.f, layer(g), layer({ ...g, clubs: ["a", "b", "c", "d", "e"] })]).toEqual([
      ["Bern", "Basel"],
      5e5,
      1,
      2,
    ]);
    expect(step(g, 10, 0).p).toBeCloseTo(20);
    expect(step({ ...g, clubs: ["a", "b", "c", "d", "e"] }, 10, 0).p).toBeCloseTo(100);
    expect(charter({ ...g, f: 1e9, clubs: ["a", "b", "c"] }, "d").clubs.length).toBe(3); // three per level
    expect(step(g, 1, 0).ban).toContain(9);
  });
  it("1291 on the keyboard opens it; three fingers that lift again do not; an old save is dropped", async () => {
    localStorage.setItem("rac.clicker", JSON.stringify({ h: 5, all: 5, own: [1], at: 0 }));
    render(<Oath />);
    act(() => {
      fireEvent.touchStart(window, { touches: [{}, {}, {}] });
      fireEvent.touchEnd(window, { touches: [{}, {}] });
    });
    expect(document.querySelector("dialog.clicker")).toBeNull();
    for (const k of "1291") fireEvent.keyDown(window, { key: k });
    await waitFor(() => expect(document.querySelector("dialog.clicker")).not.toBeNull());
    expect(document.querySelector(".clicker .stats b")!.textContent).toBe("0");
    fireEvent.pointerDown(document.querySelector(".clicker .wheel")!);
    fireEvent.pointerUp(document.querySelector(".clicker .wheel")!);
    await waitFor(() => expect(document.querySelector(".clicker .stats b")!.textContent).not.toBe("0"), {
      timeout: 4000,
    });
  });
  it("the developer screen's event opens it", async () => {
    render(<Oath />);
    act(() => void dispatchEvent(new Event(OATH)));
    await waitFor(() => expect(document.querySelector("dialog.clicker")).not.toBeNull());
  });
});
