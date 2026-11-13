// The idle clicker's sums, and the oath that opens it.
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { buy, cost, fresh, rate, tick, turn } from "./Clicker";
import { Oath } from "./Oath";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe("Clicker", () => {
  it("turns earn, hours buy helpers, helpers earn by the second, prices rise", () => {
    let g = fresh(0);
    expect(buy(g, 0)).toBe(g); // nothing to pay with
    for (let i = 0; i < 15; i++) g = turn(g);
    g = buy(g, 0);
    expect([g.h, g.own[0], rate(g), cost(g, 0)]).toEqual([0, 1, 1, 18]);
    expect(tick(g, 10_000).h).toBe(10);
    expect(tick(g, 10_000).all).toBe(25);
  });
  it("a closed app earns at most eight hours' worth", () => {
    const g = { ...fresh(0), own: [1, 0, 0, 0] };
    expect(tick(g, 30 * 864e5).h).toBe(8 * 3600);
  });
  it("1291 on the keyboard opens it; three fingers that lift again do not", async () => {
    render(<Oath />);
    act(() => {
      fireEvent.touchStart(window, { touches: [{}, {}, {}] });
      fireEvent.touchEnd(window, { touches: [{}, {}] });
    });
    expect(document.querySelector("dialog.clicker")).toBeNull();
    for (const k of "1291") fireEvent.keyDown(window, { key: k });
    await waitFor(() => expect(document.querySelector("dialog.clicker")).not.toBeNull());
    fireEvent.click(document.querySelector(".clicker .wheel")!);
    expect(document.querySelector(".clicker .n")!.textContent).toBe("1");
  });
});
