// The idle clicker's small shared pieces: the cards things are bought with, and what comes next.
import { type CSSProperties, type ReactNode, type RefObject, useLayoutEffect, useRef } from "react";
import { still } from "./fx";
import { type Game, setBulk } from "./game";
import { fmt, TEXT } from "./text";

export type Act = (f: (g: Game) => Game) => void;
/** the Avenues of Service: Club, Vocational, Community, International, Youth */
export const AV_ICONS = ["🎉", "💼", "🧤", "🌍", "🎒"];
/** a badge per role: Guest, Member, Board, President, Rotarian, DRR, Governor, RI President */
export const ROLE_ICONS = ["👤", "🙋", "📋", "🎩", "⚙️", "🗺️", "🏛️", "🌍"];
/** what comes next, before it is there */
export function Locked({ icon = "🔒", name = TEXT.locked[0], sub }: { icon?: string; name?: string; sub: string }) {
  return (
    <div className="up locked" aria-hidden="true">
      <i>{icon}</i>
      <b>{name}</b>
      <small>{sub}</small>
    </div>
  );
}
/** a thing hours buy, as a card that fills from the bottom as the hours (h) near its price, and glows once they reach it;
 * icon: an emoji or a drawing, price null: nothing more to buy (Max), n: the level bought so far, k: the levels the price buys
 * (when buying more than one at a time), cost: the price as said (time by default) */
export function Up(p: {
  icon: ReactNode;
  name: string;
  sub: string;
  price: number | null;
  h: number;
  n?: number;
  /** how many levels the price buys, shown when buying more than one at a time */
  k?: number;
  cost?: string;
  onBuy: () => void;
}) {
  const fill = p.price === null ? 0 : Math.min(p.h / p.price, 1);
  return (
    <button
      type="button"
      className={p.price === null ? "up max" : "up"}
      aria-disabled={fill < 1}
      style={{ "--p": `${fill * 100}%` } as CSSProperties}
      onClick={p.onBuy}
    >
      <i aria-hidden="true">{p.icon}</i>
      <b>{p.name}</b>
      <small>{p.sub}</small>
      <em>
        {p.price !== null && p.k !== undefined && <span className="many">×{p.k}</span>}
        {p.price === null ? TEXT.max : (p.cost ?? `${fmt(p.price)} ⏱️`)}
      </em>
      {p.n ? <strong>{p.n}</strong> : null}
    </button>
  );
}
/** how many levels a buy takes in the upgrades and the projects, AdCap-style: ×1, ×10 or ×Max (as many as the time buys);
 * one setting for both lists, kept in the save. Until it matters (on), its place is kept empty, so nothing moves when it comes */
export function Bulk({ g, act, on = true }: { g: Game; act: Act; on?: boolean }) {
  return (
    <div className={on ? "seg bulk" : "seg bulk off"} role="group" aria-label={TEXT.bulk} inert={!on}>
      {[1, 10, 0].map((b) => (
        <button key={b} type="button" aria-pressed={g.bulk === b} onClick={() => act((x) => setBulk(x, b))}>
          ×{b || TEXT.max}
        </button>
      ))}
    </div>
  );
}
/** FLIP: when the cards in `box` change (`keys`, one per child in order), each that stayed but moved glides from where it was
 * to where it is now, instead of jumping (not under reduced motion) */
export function useFlip(box: RefObject<HTMLElement | null>, keys: string): void {
  const was = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const kids = [...(box.current?.children ?? [])] as HTMLElement[];
    const ids = keys.split(",").filter(Boolean);
    const now = new Map(kids.map((el, i) => [ids[i] ?? `${i}`, el.offsetTop]));
    const before = was.current;
    was.current = now;
    if (still()) return;
    kids.forEach((el, i) => {
      const from = before.get(ids[i] ?? "");
      const dy = from === undefined ? 0 : from - el.offsetTop;
      if (dy) el.animate?.([{ translate: `0 ${dy}px` }, { translate: "0 0" }], { duration: 300, easing: "ease-out" });
    });
  }, [box, keys]);
}
