// The handover as a ceremony, laid over the game: your year in review, the General Assembly's four votes as quick picks, what
// next year brings, then the chain of office passing on, after which the game lands on the new year's upgrades (Clicker).
// Opened from the year tab (./District); the sums are in ./game. Escape or ✕ closes it before the chain passes on. The
// welcome-back card after time away (Welcome) is laid over the game the same way.
import { type CSSProperties, type KeyboardEvent, type RefObject, useEffect, useRef, useState } from "react";
import { LOCALE } from "../../i18n";
import { clubNames } from "./Exchange";
import { still } from "./fx";
import { type AwaySum, CULT, effects, type Game, gain, handover, heads, helped, RHYTHM, rank } from "./game";
import { play } from "./sound";
import { fmt, TEXT } from "./text";
import { AV_ICONS, ROLE_ICONS } from "./ui";

/** a change in whole percent, signed: +10 %, −30 % */
const pct = (n: number): string => `${n > 0 ? "+" : "−"}${Math.abs(n)} %`;
/** what a culture or rhythm does, in a few words: "run time +10 % · tiredness −30 %" */
const lawLine = (m: Parameters<typeof effects>[0]): string =>
  effects(m)
    .map(([k, n]) => `${TEXT.law[k]} ${pct(n)}`)
    .join(" · ");
/** a motion of the General Assembly: its name, its choices as shown (labels: as said, when the chips are icons), and what each
 * one does */
interface Motion {
  name: string;
  chips: string[];
  labels?: string[];
  fx: string[];
}
/** the four motions: culture, meeting rhythm, the president's theme (an Avenue's kind counts double), the twin club */
export function motions(): Motion[] {
  const twins = clubNames();
  return [
    { name: TEXT.motions[0], chips: [...TEXT.cults], fx: CULT.map(lawLine) },
    { name: TEXT.motions[1], chips: [...TEXT.rhythms], fx: RHYTHM.map(lawLine) },
    { name: TEXT.motions[2], chips: AV_ICONS, labels: [...TEXT.av], fx: AV_ICONS.map((_, k) => `${TEXT.kinds[k]} ×2`) },
    // the chips without the "Rotaract (Club)" every name starts with, so they fit
    {
      name: TEXT.motions[3],
      chips: twins.map((n) => n.replace(/^Rotaract (Club )?/, "")),
      labels: twins,
      fx: twins.map(() => TEXT.twinDo),
    },
  ];
}
/** last year's votes, or each motion's first choice where there was none */
const preset = (ga: number[]): number[] => ga.map((v) => Math.max(v, 0));
/** the votes after choice i of motion k was tapped: taken, or taken back if it was the pick */
const tapVote = (votes: number[], k: number, i: number): number[] =>
  votes.map((v, j) => {
    if (j !== k) return v;
    return v === i ? -1 : i;
  });

/** the ceremony's steps: the year in review, the General Assembly, what next year brings, the chain passing on */
const STEPS = 4;
const CHAIN = STEPS - 1;
/** a share from 0 to 1 that rises over a second and a bit after it mounts (eased), for numbers that count up; 1 at once under
 * reduced motion */
function useRise(): number {
  const [k, setK] = useState(() => (still() ? 1 : 0));
  useEffect(() => {
    if (still()) return;
    const t0 = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const x = Math.min((now - t0) / 1200, 1);
      setK(1 - (1 - x) ** 3);
      if (x < 1) id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return k;
}

/** the ceremony over the game (which stands still meanwhile), for the year g; onHand: the chain has passed on, with the votes
 * for next year; onClose: closed before that. Its root takes the focus of a click on nothing focusable, so Escape still
 * reaches it. */
export function Ceremony(p: { g: Game; onHand: (votes: number[]) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [votes, setVotes] = useState(() => preset(p.g.ga));
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => head.current?.focus(), [step]);
  const key = (ev: KeyboardEvent) => {
    if (ev.key !== "Escape") return;
    // never the game's own Escape (it would close the game)
    ev.preventDefault();
    ev.stopPropagation();
    if (step < CHAIN) p.onClose();
  };
  const pass = () => {
    if (p.g.sfx) play("fanfare");
    setStep(CHAIN);
  };
  return (
    <div className="ceremony" role="dialog" aria-modal="true" aria-label={TEXT.hand[0]} tabIndex={-1} onKeyDown={key}>
      <div className="cer">
        <div className="cer-top">
          {step > 0 && step < CHAIN ? (
            <button type="button" className="cer-x" onClick={() => setStep(step - 1)}>
              ‹ {TEXT.cer.back}
            </button>
          ) : (
            <span />
          )}
          <ol className="cer-dots" aria-hidden="true">
            {Array.from({ length: STEPS }, (_, i) => (
              <li key={i} className={i === step ? "on" : ""} />
            ))}
          </ol>
          {step < CHAIN ? (
            <button type="button" className="cer-x" aria-label={TEXT.cer.close} onClick={p.onClose}>
              ✕
            </button>
          ) : (
            <span />
          )}
        </div>
        {step === 0 && <Review g={p.g} head={head} onNext={() => setStep(1)} />}
        {step === 1 && <Assembly votes={votes} set={setVotes} head={head} onNext={() => setStep(2)} />}
        {step === 2 && <Brings g={p.g} votes={votes} head={head} onPass={pass} />}
        {step === CHAIN && <Chain role={rank(p.g)} head={head} onDone={() => p.onHand(votes)} />}
      </div>
    </div>
  );
}
type Head = { head: RefObject<HTMLHeadingElement | null> };
/** step 1: the year in numbers, counting up */
function Review({ g, head, onNext }: { g: Game; onNext: () => void } & Head) {
  const k = useRise();
  const n = (x: number) => Math.round(x * k);
  const role = rank(g);
  const tiles: [string, string, string][] = [
    ["⏱️", fmt(g.all * k), TEXT.hours],
    ["❤️", `${n(helped(g))}`, TEXT.helped],
    ["👥", `${n(heads(g))} · ${n(g.top)}`, TEXT.cer.members],
    ["🧤", `${n(g.runs)}`, TEXT.cer.runs],
    ["🏛️", `${n(g.chart)}`, TEXT.cer.clubs],
    [ROLE_ICONS[role]!, TEXT.ranks[role]!, TEXT.role],
  ];
  return (
    <>
      <h3 tabIndex={-1} ref={head}>
        🎖 {TEXT.cer.review}
      </h3>
      <ul className="cer-tiles">
        {tiles.map(([icon, v, label]) => (
          <li key={label}>
            <i aria-hidden="true">{icon}</i>
            <b>{v}</b>
            <small>{label}</small>
          </li>
        ))}
      </ul>
      <button type="button" className="btn cer-go" onClick={onNext}>
        {TEXT.cer.next} ›
      </button>
    </>
  );
}
/** step 2: the General Assembly, a row of chips per motion, each saying what it does; tap the pick again for none. Skip moves
 * on with the picks as they are (last year's, unless changed). */
function Assembly(p: { votes: number[]; set: (v: number[]) => void; onNext: () => void } & Head) {
  return (
    <>
      <h3 tabIndex={-1} ref={p.head}>
        🗳️ {TEXT.ga[0]}
      </h3>
      <p>{TEXT.ga[1]}</p>
      {motions().map((m, k) => (
        <fieldset key={m.name} className="motion">
          <legend>{m.name}</legend>
          {m.chips.map((c, i) => (
            <button
              key={c}
              type="button"
              className="vote"
              aria-pressed={p.votes[k] === i}
              onClick={() => p.set(tapVote(p.votes, k, i))}
            >
              <b aria-hidden={m.labels ? true : undefined}>{c}</b>
              {m.labels && <span className="sr">{m.labels[i]}</span>}
              <small>{m.fx[i]}</small>
            </button>
          ))}
        </fieldset>
      ))}
      <div className="cer-row">
        <button type="button" className="link" onClick={p.onNext}>
          {TEXT.cer.skip}
        </button>
        <button type="button" className="btn cer-go" onClick={p.onNext}>
          {TEXT.cer.next} ›
        </button>
      </div>
    </>
  );
}
/** step 3: what next year brings with these votes (the bonus on everything, the members to start with, the clubs kept), and the
 * button that passes the chain on */
function Brings({ g, votes, head, onPass }: { g: Game; votes: number[]; onPass: () => void } & Head) {
  const next = handover(g, votes);
  const x = gain(next).toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  return (
    <>
      <h3 tabIndex={-1} ref={head}>
        🌅 {TEXT.cer.brings}
      </h3>
      <p className="cer-big">{TEXT.cer.gain.replace("{x}", x)}</p>
      <ul className="cer-list">
        <li>{TEXT.cer.start.replace("{n}", `${heads(next)}`)}</li>
        {next.chart > 0 && <li>{TEXT.cer.kept.replace("{n}", `${next.chart}`)}</li>}
        <li>
          {ROLE_ICONS[rank(next)]} {TEXT.ranks[rank(next)]}
        </li>
      </ul>
      <button type="button" className="btn hand cer-go" onClick={onPass}>
        🎖 {TEXT.cer.chain}
      </button>
    </>
  );
}
/** step 4: the gold chain of office passes from you to your successor; when it has arrived (its animation's end, a fade under
 * reduced motion), onDone */
function Chain({ role, head, onDone }: { role: number; onDone: () => void } & Head) {
  return (
    <>
      <h3 tabIndex={-1} ref={head}>
        {TEXT.cer.chain}
      </h3>
      <div className="chain" aria-hidden="true">
        <span className="who">{ROLE_ICONS[role]}</span>
        <span className="links" onAnimationEnd={(ev) => ev.target === ev.currentTarget && onDone()}>
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ "--i": i, "--k": i % 2 } as CSSProperties} />
          ))}
          <b>🏅</b>
        </span>
        <span className="who">🙂</span>
      </div>
      <p role="status">{TEXT.cer.passing}</p>
    </>
  );
}
/** the card after time away (the time is already added: closing the game without collecting loses nothing): what happened
 * meanwhile, counting up, and Collect, which celebrates (onCollect); Escape collects too */
export function Welcome({ s, onCollect }: { s: AwaySum; onCollect: () => void }) {
  const k = useRise();
  const go = useRef<HTMLButtonElement>(null);
  // after the popup's own focus on its title when the game opens with the card
  useEffect(() => {
    const id = setTimeout(() => go.current?.focus());
    return () => clearTimeout(id);
  }, []);
  const tiles = (k: number): [string, string, string][] => [
    ["🌙", fmt(s.secs), TEXT.back.gone],
    ["⏱️", fmt(s.got * k), TEXT.hours],
    ["🧤", `${Math.round(s.runs * k)}`, TEXT.cer.runs],
    ["🚂", `${Math.round(s.moved * k)}`, TEXT.back.moved],
  ];
  const key = (ev: KeyboardEvent) => {
    if (ev.key !== "Escape") return;
    ev.preventDefault();
    ev.stopPropagation();
    onCollect();
  };
  return (
    <div
      className="ceremony"
      role="dialog"
      aria-modal="true"
      aria-label={TEXT.back.title}
      aria-describedby="clk-back"
      tabIndex={-1}
      onKeyDown={key}
    >
      <div className="cer welcome">
        <h3>👋 {TEXT.back.title}</h3>
        {/* what a screen reader hears with the card: the numbers as they end, not as they count up */}
        <p id="clk-back" className="sr">
          {tiles(1)
            .map(([, v, label]) => `${label}: ${v}`)
            .join(", ")}
        </p>
        <ul className="cer-tiles" aria-hidden="true">
          {tiles(k).map(([icon, v, label]) => (
            <li key={label}>
              <i aria-hidden="true">{icon}</i>
              <b>{v}</b>
              <small>{label}</small>
            </li>
          ))}
        </ul>
        <button type="button" className="btn cer-go" ref={go} onClick={onCollect}>
          ✨ {TEXT.back.collect.replace("{n}", fmt(s.got))}
        </button>
      </div>
    </div>
  );
}
