// Easter egg: an idle clicker about a Rotaract club, which grows a stage at a time and the screen with it, a tab at a time. At
// first there is the Rotaract wheel and one number: turning the wheel by hand earns service time (from nanoseconds up), and that
// buys what makes it turn better (Handshake, Momentum, then swiping and holding). At SHOW.club earned you join your home club as
// a member (Board with the projects, President with the Avenues, then Rotarian, DRR, Governor, RI President): its members make
// the wheel bigger (more a turn), but the work tires them, and one energy bar stands for the whole club. Socials refill it; under LOW members leave, and with the last one the club folds and the year starts over. Then come the
// Rotary family in the upgrades (their wheels mesh with ours and turn it by themselves), the projects (AdCap-style: buy,
// run by hand, or by a committee) at GATE.proj members, the Avenues at GATE.av, the exchange (./Exchange), and the district and
// the year with its handover (./District).
// Opened by the Rütli oath (./Oath). Everything of it is in this folder: the sums in ./game, the texts in four languages in ./text
// (not in i18n/), so the app's first load carries none of it. The state is one localStorage value, rac.clicker.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import "./Clicker.css";
import { LOCALE } from "../../i18n";
import { eventById, getData, loaded, myClubs } from "../../lib/data";
import { store } from "../../lib/store";
import { Popup } from "../Popup/Popup";
import {
  amount,
  away,
  type AwaySum,
  awaySum,
  best,
  bulkPrice,
  buyCom,
  buyHold,
  buyLevels,
  buySocCom,
  buySpin,
  bulkShown,
  CARDS,
  comPrice,
  crowd,
  EVENT,
  EX_AT,
  FAM,
  flipCom,
  flipSoc,
  free,
  fresh,
  GATE,
  glide,
  handover,
  heads,
  helped,
  bellQuiet,
  idle,
  kick,
  layer,
  LOW,
  MARKET,
  market,
  mentors,
  MESH,
  MILES,
  mix,
  news,
  nextMile,
  OIL_MAX,
  PROJ,
  perRun,
  perTurn,
  points,
  ptsLeft,
  nextRole,
  rank,
  rateOn,
  ROLE_NEED,
  realEvent,
  refound,
  ring,
  recruit,
  recruitPrice,
  runTime,
  SHOW,
  setPts,
  SPIN,
  shownCards,
  shownFam,
  shownProj,
  slipping,
  slips,
  social,
  socialPrice,
  socComPrice,
  startEvent,
  startRun,
  step,
  TALK,
  talk,
  working,
  type Game,
} from "./game";
import { Ceremony, Welcome } from "./Ceremony";
import { confLine, District, Year } from "./District";
import { Exchange } from "./Exchange";
import { Confetti, Switches, still, useFx } from "./fx";
import { play } from "./sound";
import { fmt, parts, TEXT } from "./text";
import { CogIcon, dock, famName, placed, Train, train } from "./Train";
import { type Act, AV_ICONS, Bulk, Locked, ROLE_ICONS, Up, useFlip } from "./ui";

/** the crowd's faces, from exhausted (under LOW) to happy (over 0.6) */
const FACES = ["😫", "😓", "🙂", "😄"];
const PROJ_ICONS = ["🧹", "🧤", "🩸", "📚", "🚚", "🏕️", "💧", "🌍"];
/** the tabs under the wheel, in the order they come: upgrades and club (stage 2), projects (4), exchange (6), district (7), year
 * (8); before the club the upgrades alone, without a tab bar */
const TAB_ICONS = ["⚙️", "👥", "🧤", "📈", "🗺️", "🎖"];
/** how many tabs there are at each stage (none before the club; the family, stage 3, is in the upgrades', the Avenues, stage 5,
 * in the club's) */
const TABS_AT = [0, 0, 2, 2, 3, 3, 4, 5, 6];
/** how small the train is drawn at each layer (club, district, country, international): it zooms out as it grows */
const ZOOM = [1, 0.8, 0.65, 0.5];
/** what is said under the wheel when a stage is reached, by stage (the club's founding is said by Promo) */
const STAGE_SAYS: Record<number, string> = {
  3: TEXT.famJoin,
  4: TEXT.gateJoin[0].replace("{n}", `${GATE.proj}`),
  5: TEXT.gateJoin[1].replace("{n}", `${GATE.av}`),
  6: TEXT.exJoin,
  7: TEXT.distJoin,
  8: TEXT.yearJoin,
};
/** the name of the club you join: your home club in the app, or a real one */
const clubName = (): string => (loaded && getData().clubs[getData().settings.home]?.name) || "Rotaract Club Bern";
/** the face the crowd makes at the club's energy */
const faceOf = (g: Game): string => FACES[[LOW, 0.35, 0.6].filter((n) => g.en > n).length]!;

interface Sim {
  /** our wheel: turns so far, turns per second */
  a: number;
  w: number;
  held: boolean;
  /** reduced motion: the wheel is drawn turning only by what the player does, not by the family */
  still: boolean;
  /** the turns a swipe made forward since the last step, paid in the step up to the swipe's top speed */
  swiped: number;
  /** the finger on the wheel: where it was (in turns around the middle) and when, how far it went, how fast */
  drag: { at: number; t: number; moved: number; v: number } | null;
}
/** moves the wheel on by dt seconds, for game g: a finger resting on it loses its last swipe's speed; held down (once that is
 * bought) it speeds up by a turn a second, each second; let go, it slows to what the family keeps it at. Returns the turns made
 * (a swipe's forward ones, at most its top speed's worth), the speed the club has to keep up with, and the turns that are the
 * player's own (all of them under a finger, else those beyond what the family turns). */
function spinOn(s: Sim, g: Game, dt: number): { turns: number; speed: number; mine: number } {
  const rest = idle(g);
  if (s.drag && performance.now() - s.drag.t > 100) s.drag.v = 0;
  if (s.held && g.spin >= 2) s.w = Math.min(Math.max(SPIN[2][0], rest), s.w + dt);
  else s.w = rest + (s.w - rest) * Math.exp(-dt / glide(g));
  if (s.drag && s.drag.moved > 0.02) {
    // the swipe, or what the wheel turns by itself (the family, holding it) if that is more
    const turns = Math.max(Math.min(s.swiped, SPIN[g.spin]![0] * dt), s.w * dt, 0);
    s.swiped = 0;
    return { turns, speed: turns / dt, mine: turns };
  }
  // reduced motion: only what the player adds, never backwards while the family speeds it up
  s.a += (s.still ? Math.max(s.w - rest, 0) : s.w) * dt;
  const turns = Math.max(s.w * dt, 0);
  return { turns, speed: s.w, mine: s.held && g.spin >= 2 ? turns : Math.max(turns - rest * dt, 0) };
}
/** the cards shown so far (the wheel's, the family's, the projects'): one more is an unlock */
const cards = (g: Game): number =>
  [SHOW.oil, SHOW.swipe, SHOW.hold].filter((n) => g.all >= n).length + shownFam(g) + shownProj(g);
/** the tabs there are */
const tabCount = (g: Game): number => TABS_AT[Math.min(g.stage, 8)]!;
/** the tab shown of n: the first if the one picked is not there (any more, after a new start) */
const tabShown = (tab: number, n: number): number => (tab < n ? tab : 0);
/** where the pointer is around the middle of the wheel, in turns */
const around = (ev: PointerEvent<HTMLElement>): number => {
  const b = ev.currentTarget.getBoundingClientRect();
  return Math.atan2(ev.clientY - b.top - b.height / 2, ev.clientX - b.left - b.width / 2) / (2 * Math.PI);
};
/** the saved game brought up to now, and what the welcome-back card tells of the time away (null under a minute of it) */
function load(): [Game, AwaySum | null] {
  const saved = store.get("rac.clicker", null);
  // a field added since the save was made starts at its default
  const was = saved?.v === 10 ? { ...fresh(Date.now()), ...saved } : fresh(Date.now());
  const now = away(was, Date.now());
  return [now, awaySum(was, now)];
}
/** watched again after `gone` (the game when nobody watched any more; null: watched all along): what happened meanwhile goes
 * on the welcome-back card if it was long enough (x has every away() of it by now; a short hiccup leaves a card that is up
 * as it is). Returns null, the new `gone`. */
function watched(gone: Game | null, x: Game, show: (s: AwaySum) => void): null {
  const s = gone && awaySum(gone, x);
  if (s) show(s);
  return null;
}
/** the rate under the score: the time earned in all at the last watched step (-1: none, after time away or an overlay), the
 * rate and its recent top (rateOn) */
interface Rated {
  was: number;
  r: number;
  top: number;
}
/** the rate after a watched step of dt seconds to `all` earned in all */
function rated(m: Rated, all: number, dt: number): number {
  if (m.was >= 0) [m.r, m.top] = rateOn(m.r, m.top, (all - m.was) / dt, dt);
  m.was = all;
  return m.r;
}
/** the sixth of a turn the wheel is at now, with a tick if it moved on from `spoke`, the one it was at */
function ticked(spoke: number, s: Sim, g: Game): number {
  const at = Math.floor(s.a * 6);
  if (at !== spoke && g.sfx && !g.folded) play("tick", s.w);
  return at;
}
/** the bell at `now` (until when it rings, or null): ringing on until its time, else ringing anew for TALK.bell if it `rings` */
function rung(b: number | null, now: number, rings: boolean): number | null {
  if (b && now < b) return b;
  return rings ? now + TALK.bell * 1000 : null;
}
/** a "+12" flying off the wheel: what it says, where on our wheel's rim it starts (radians, 0 right, -π/2 the top) */
let popId = 0;
interface Pop {
  id: number;
  n: number;
  a: number;
}
/** the most "+n" in the air at once: more is added to the newest */
const POPS = 3;

export default function Clicker({ onClose }: { onClose: () => void }) {
  const [[first, sum0]] = useState(load);
  const [g, setG] = useState(first);
  /** a line under the wheel for a few seconds: a stage or layer reached, a welcome */
  const [toast, setToast] = useState("");
  /** the welcome-back card, after time away (on opening, or the tab shown again) */
  const [back, setBack] = useState(sum0);
  /** our wheel as drawn: turns so far, turns per second (for the glow) */
  const [wheel, setWheel] = useState({ a: 0, w: 0 });
  /** the time earned a second while watched, eased (for the line under the score) */
  const [rate, setRate] = useState(0);
  /** the wheel (for the focus when an overlay closes and what had it is gone) */
  const wheelBtn = useRef<HTMLButtonElement>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  /** the tab shown, once there are tabs (stage 2) */
  const [tab, setTab] = useState(0);
  /** when the game was opened, for the real events coming up */
  const [opened] = useState(Date.now);
  /** Rotex's bell, while it rings (in its dock): until when */
  const [bell, setBell] = useState<number | null>(null);
  /** until when the bell keeps quiet: while the talks are on offer, then a talk and its usual wait (Date.now() time) */
  const quiet = useRef(0);
  /** the bell was tapped: the three talks are on offer */
  const [speaker, setSpeaker] = useState(false);
  const [sim0] = useState<Sim>(() => ({ a: 0, w: 0, held: false, still: still(), swiped: 0, drag: null }));
  const sim = useRef(sim0);
  /** hours earned since the last "+n" flew */
  const gain = useRef({ n: 0, at: 0 });
  const last = useRef(g);
  useEffect(() => {
    last.current = g;
  }, [g]);
  const club = g.mem > 0;
  const role = rank(g);
  // each stage's coming is said under the wheel
  const stageWas = useRef(g.stage);
  useEffect(() => {
    const say = g.stage > stageWas.current && STAGE_SAYS[g.stage];
    if (say) setToast(say);
    stageWas.current = g.stage;
  }, [g.stage]);
  // a new layer is said under the wheel too, as the train zooms out
  const lay = layer(g);
  const layWas = useRef(lay);
  useEffect(() => {
    if (lay > layWas.current) setToast(TEXT.layerUp.replace("{l}", TEXT.layers[lay]!));
    layWas.current = lay;
  }, [lay]);
  // the role as promoted: Rotarian comes with the handover, whose ceremony is its celebration (no second cue, no Promo card)
  const promo = rank({ ...g, years: 0 });
  // sounds and confetti: a stage, layer or role reached, a new card shown, a purchase (act plays it)
  const { act, bursts, cheer } = useFx(g, setG, g.stage + lay + promo, cards(g));
  /** the handover ceremony is open (over the game) */
  const [cer, setCer] = useState(false);
  /** the ceremony or the welcome-back card is over the game: it stands still (the club cannot fold under it) */
  const over = cer || !!back;
  const hold = useRef(over);
  /** what had the focus when an overlay opened (the Hand over button): it gets it back when the overlay closes, or the wheel if
   * it is gone (the handover lands on the upgrades) */
  const opener = useRef<HTMLElement | null>(null);
  const wasOver = useRef(over);
  const game = useRef<HTMLDivElement>(null);
  useEffect(() => {
    hold.current = over;
    // the popup's own header (its ✕) out of reach too, so that Tab stays in the overlay
    game.current?.closest("dialog")?.querySelector(".obhead")?.toggleAttribute("inert", over);
    if (wasOver.current && !over) {
      // nothing had it (Safari never focuses a clicked button), or it is gone: the wheel
      const keep = opener.current?.isConnected && opener.current !== document.body;
      (keep ? opener.current : wheelBtn.current)?.focus();
      opener.current = null;
    }
    wasOver.current = over;
  }, [over]);
  // Escape while the focus is on nothing in an overlay (a click on a tile, Safari's buttons) reaches the popup's dialog, which
  // would close the whole game: it goes to the overlay (or the ladder) instead
  useEffect(() => {
    const dlg = game.current?.closest("dialog");
    const cancel = (ev: Event) => {
      const top = dlg?.querySelector(".ceremony, .ladder");
      if (!top) return;
      ev.preventDefault();
      top.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    };
    dlg?.addEventListener("cancel", cancel);
    return () => dlg?.removeEventListener("cancel", cancel);
  }, []);
  /** the chain has passed on: the new year with these votes, landing on its upgrades with a welcome */
  const handOver = (votes: number[]) => {
    const x = handover(last.current, votes);
    setCer(false);
    if (x === last.current) return;
    setG((y) => handover(y, votes));
    setTab(0);
    setToast(TEXT.cer.welcome.replace("{n}", `${x.years + 1}`).replace("{r}", TEXT.ranks[rank(x)]!));
  };
  /** the welcome-back card collected: the bling and confetti (the time was added when it was computed) */
  const collect = () => {
    if (g.sfx) play("bling");
    cheer(64);
    setBack(null);
  };
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  /** count what the wheel earned, and now and then let it fly off as a "+n" */
  const earn = (n: number, now: number) => {
    const c = gain.current;
    c.n += n;
    if (c.n < 1 || now - c.at < 350) return;
    // from the top of the rim, a little to either side
    const pop = { id: ++popId, n: c.n, a: -Math.PI / 2 + (Math.random() - 0.5) * 1.2 };
    c.n = 0;
    c.at = now;
    setPops((p) => {
      const top = p.at(-1);
      return p.length < POPS || !top ? [...p, pop] : [...p.slice(0, -1), { ...top, n: top.n + pop.n }];
    });
  };
  // ten steps a second while it is open; saved when it closes or the page goes away, not every step (a save re-renders the app)
  useEffect(() => {
    let then = Date.now();
    /** the sixth of a turn the wheel was at: a tick each time it moves on to the next */
    let spoke = 0;
    /** the game as it was when nobody was watching any more (a hidden tab, held back ticks), for the welcome-back card */
    let gone: Game | null = null;
    /** the rate under the score (rated) */
    const m: Rated = { was: -1, r: 0, top: 0 };
    /** a welcome-back card to show: what has the focus now gets it back when it is collected */
    const show = (sum: AwaySum) => {
      opener.current ??= document.activeElement as HTMLElement | null;
      setBack(sum);
    };
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - then) / 1000;
      const s = sim.current;
      const x = last.current;
      const from = then;
      then = now;
      // the clock set back: nothing happened
      if (dt <= 0) return;
      // a hidden tab, or ticks held back by the browser: nobody is watching, so the club is treated as when the app is closed
      if (document.hidden || dt > 1) {
        gone ??= { ...x, at: from };
        m.was = -1;
        setG((y) => away({ ...y, at: from }, now));
        s.w = idle(x);
        return;
      }
      gone = watched(gone, x, show);
      // an overlay over the game: it stands still, and the rate starts again after it
      if (hold.current) {
        Object.assign(m, { was: -1, r: 0, top: 0 });
        return;
      }
      setRate(rated(m, x.all, dt));
      const { turns, speed, mine } = spinOn(s, x, dt);
      setWheel({ a: s.a, w: s.w });
      spoke = ticked(spoke, s, x);
      // the family's slips: a roll per wheel, drawn here
      const rolls = FAM.map(() => Math.random());
      setG((y) => slips(step(y, dt, turns, speed, false, mine), dt, rolls));
      if (!x.folded) earn(turns * perTurn(x), performance.now());
      // the bell: now and then with Rotex, for a few seconds, in its dock; not while it keeps quiet
      const rings = now >= quiet.current && ring(x, dt, Math.random());
      setBell((b) => rung(b, now, rings));
    }, 100);
    const save = () => store.set("rac.clicker", { ...last.current, at: Date.now() });
    // a phone may drop a hidden tab without a pagehide
    const hide = () => document.hidden && save();
    addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(id);
      removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", hide);
      save();
    };
  }, []);
  // the exchange's prices move every MARKET.tick seconds while it is open (not while away); the rolls are drawn here
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const rolls = MARKET.vol.map(() => Math.random());
      setG((y) => market(y, MARKET.tick, rolls));
    }, MARKET.tick * 1000);
    return () => clearInterval(id);
  }, []);
  // the wheel under a finger: a tap pushes it, a swipe (once bought) turns it with the finger and lets it run on
  const down = (ev: PointerEvent<HTMLElement>) => {
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    if (g.sfx) play("tick", sim.current.w);
    sim.current.held = true;
    sim.current.drag = { at: around(ev), t: ev.timeStamp, moved: 0, v: 0 };
  };
  const move = (ev: PointerEvent<HTMLElement>) => {
    const s = sim.current;
    if (!s.drag || g.spin < 1) return;
    const at = around(ev);
    const d = ((at - s.drag.at + 1.5) % 1) - 0.5; // the short way round
    const top = SPIN[g.spin]![0];
    const v = d / Math.max((ev.timeStamp - s.drag.t) / 1000, 0.001) / 2 + s.drag.v / 2;
    s.drag = { at, t: ev.timeStamp, moved: s.drag.moved + Math.abs(d), v: Math.max(-top, Math.min(top, v)) };
    s.a += d;
    // only forward counts; the step pays it, no faster than the swipe's top speed
    s.swiped += Math.max(d, 0);
    setWheel({ a: s.a, w: s.w });
  };
  const up = () => {
    const s = sim.current;
    const top = SPIN[g.spin]![0];
    // never slower than it already turns (the family may turn it faster than a hand can)
    if (s.drag && s.drag.moved > 0.02) s.w = Math.max(s.w, s.drag.v, 0);
    else s.w = Math.max(s.w, Math.min(top, Math.max(s.w, 0) + kick(g)));
    s.held = false;
    s.drag = null;
    s.swiped = 0;
  };
  const n = tabCount(g);
  const shown = tabShown(tab, n);
  const bulk = useBulk(g);
  // the train as drawn: the "+n" fly off our wheel's rim, the bell sits in the corner clear of it
  const most = ZOOM[lay]! * (0.85 + 0.15 * big(g));
  const gears = train(g.fam, g.fm, 0);
  const at = placed(gears, most);
  return (
    <Popup title={TEXT.title} onClose={onClose} className="ob full clicker">
      <Confetti bursts={bursts} />
      {cer && <Ceremony g={g} onHand={handOver} onClose={() => setCer(false)} />}
      {back && !cer && <Welcome s={back} onCollect={collect} />}
      {/* the game, out of reach while the ceremony or the welcome-back card is over it */}
      <div className="game" ref={game} inert={over}>
        <Switches g={g} set={setG} />
        <Hud g={g} role={role} rate={rate} />
        {g.folded ? (
          <Folded
            onAgain={() => {
              const now = Date.now();
              setG((x) => ({ ...refound(x), at: now }));
            }}
          />
        ) : (
          <>
            {/* the wheel, always on top; what is said over it (a talk, the conference, a promotion, a toast) never moves the rest */}
            <div className="top">
              <div className={g.stage >= 3 ? "stage fam" : "stage"} style={speedLook(wheel.w)}>
                <Charters n={g.chart} a={wheel.a} />
                <Train g={g} a={wheel.a} most={most}>
                  <button
                    ref={wheelBtn}
                    className={wheelClass(g)}
                    type="button"
                    aria-label={TEXT.tap}
                    onPointerDown={down}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={up}
                    onContextMenu={(ev) => ev.preventDefault()}
                    onKeyDown={(ev) => {
                      if ((ev.key === " " || ev.key === "Enter") && !ev.repeat) sim.current.held = true;
                    }}
                    onKeyUp={(ev) => (ev.key === " " || ev.key === "Enter") && up()}
                  >
                    {/* the wheel alone, cut out of the brand mark */}
                    <img src={WHEEL} alt="" draggable={false} style={{ rotate: `${wheel.a * 360}deg` }} />
                    {/* before the very first tap: a pulsing hand, no words */}
                    {untapped(g) && (
                      <span className="hand" aria-hidden="true">
                        👆
                      </span>
                    )}
                  </button>
                </Train>
                <Pops
                  pops={pops}
                  at={at}
                  fam={g.stage >= 3}
                  drop={(id) => setPops((q) => q.filter((o) => o.id !== id))}
                />
                {bell && (
                  <button
                    className={`bell c${dock(gears, most)[0]}`}
                    type="button"
                    aria-label={TEXT.bell}
                    onClick={() => {
                      quiet.current = Number.POSITIVE_INFINITY;
                      setSpeaker(true);
                      setBell(null);
                    }}
                  >
                    🔔
                  </button>
                )}
              </div>
              <div className="over">
                <Boosts g={g} />
                <Promo role={promo} />
                <div className="says">
                  <Toast text={toast} />
                  {speaker && (
                    <Talks
                      onPick={(k) => {
                        quiet.current = Date.now() + bellQuiet(last.current) * 1000;
                        setG((x) => talk(x, k));
                        setSpeaker(false);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            <p className="hint">{TEXT.turn.replace("{n}", fmt(perTurn(g)))}</p>
            {n > 0 && <Tabs g={g} n={n} tab={shown} set={setTab} />}
            {shown === 0 && <Upgrades g={g} act={act} bulk={bulk} />}
            {shown === 1 && club && <Club g={g} act={act} />}
            <Later
              g={g}
              tab={shown}
              act={act}
              now={opened}
              onHand={() => {
                opener.current = document.activeElement as HTMLElement | null;
                setCer(true);
                cheer(48);
              }}
            />
          </>
        )}
      </div>
    </Popup>
  );
}
/** a number that rolls toward `to` every animation frame (a quarter of a second behind), so a count keeps ticking up between
 * the game's steps; down it goes at once (what was spent is gone) */
function useRolling(to: number): number {
  const [shown, setShown] = useState(to);
  useEffect(() => {
    let then = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const k = 1 - Math.exp(-(now - then) / 250);
      then = now;
      setShown((s) => (to <= s || to - s < to * 1e-4 ? to : s + (to - s) * k));
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [to]);
  // after a spend, the real value at once
  return Math.min(shown, to);
}
/** whether ×1 / ×10 / ×Max shows: once it matters (bulkShown), it stays while the game is open */
function useBulk(g: Game): boolean {
  const now = bulkShown(g);
  const [was, setWas] = useState(now);
  useEffect(() => {
    if (now) setWas(true);
  }, [now]);
  return was || now;
}
/** the "+n" in the air, each from its spot on our wheel's rim (drawn at `at`; smaller among the family's wheels) */
function Pops({
  pops,
  at,
  fam,
  drop,
}: {
  pops: Pop[];
  at: { s: number; x: number; y: number };
  fam: boolean;
  drop: (id: number) => void;
}) {
  // the wheel's radius in stage units: 40 % of the stage among the family, else 56 %
  const r = fam ? 60 : 84;
  return pops.map((p) => (
    <span
      key={p.id}
      className="pop"
      aria-hidden="true"
      style={{
        left: `${50 + (at.x + at.s * r * Math.cos(p.a)) / 3}%`,
        top: `${50 + (at.y + at.s * r * Math.sin(p.a)) / 3}%`,
      }}
      onAnimationEnd={() => drop(p.id)}
    >
      +{fmt(p.n)}
    </span>
  ));
}
/** the score on top: the time to spend (rolling; the number and its unit in slots of their own, so nothing moves), what is
 * earned a second, the people helped from the year tab on, and your role (a badge of a fixed size that bounces in again at a
 * promotion, with a bar toward the next role; tapped, it opens the ladder of roles) */
function Hud({ g, role, rate }: { g: Game; role: number; rate: number }) {
  const n = helped(g);
  const [num, unit] = parts(useRolling(g.h));
  const [open, setOpen] = useState(false);
  const next = nextRole(g);
  const key = (ev: KeyboardEvent) => {
    if (ev.key !== "Escape" || !open) return;
    // never the game's own Escape (it would close the game)
    ev.preventDefault();
    ev.stopPropagation();
    setOpen(false);
  };
  return (
    <div className="hud" onKeyDown={key}>
      <p className="score">
        <b>{num}</b>
        <span className="unit">{unit}</span>
        <span className="lbl">
          <span>⏱️ {TEXT.hours}</span>
          {rate > 0 && (
            <i className="rate" title={TEXT.rate}>
              · +{fmt(rate)}/s
            </i>
          )}
          {g.stage >= 8 && n >= 1 && <i className="heart"> · ❤️ {n}</i>}
        </span>
      </p>
      {/* it bounces in again at a promotion: each role the other of two same animations, so the button stays (and its focus) */}
      <button
        type="button"
        className={role % 2 ? "rank odd" : "rank"}
        aria-expanded={open}
        aria-controls="clk-ladder"
        onClick={() => setOpen((o) => !o)}
      >
        <small>{TEXT.role}</small>
        <b>
          {ROLE_ICONS[role]} {TEXT.ranks[role]}
        </b>
        {next && <i className="toward" style={{ "--k": next[1] / next[2] } as CSSProperties} aria-hidden="true" />}
      </button>
      {open && <Ladder g={g} role={role} setOpen={setOpen} />}
    </div>
  );
}
/** what role r takes, said: "👥 6 members", "⏱️ 18.0 µs given in all" */
const roleHow = (r: number): string => {
  const need = ROLE_NEED[r] ?? 0;
  return (TEXT.ladder.how[r] ?? "").replace("{n}", r === 1 ? fmt(need) : `${need}`);
};
/** what role r brings (TEXT.perks; a Member their home club) */
const brings = (r: number): string => TEXT.perks[r] || (r === 1 ? TEXT.yourClub : "");
/** the ladder of roles, under the badge: the ones reached bright, yours marked, the next one with what it takes and how far you
 * are, and what each brings; a tap anywhere outside it closes it */
function Ladder({ g, role, setOpen }: { g: Game; role: number; setOpen: (o: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (ev: Event) => {
      const at = ev.target as Node;
      if (!box.current?.parentElement?.contains(at)) setOpen(false);
    };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, [setOpen]);
  const next = nextRole(g);
  return (
    <div ref={box} id="clk-ladder" className="ladder" role="group" aria-label={TEXT.ladder.title}>
      <b>{TEXT.ladder.title}</b>
      <ol>
        {ROLE_ICONS.map((icon, r) => (
          <li key={icon} className={r > role ? "ahead" : "got"} aria-current={r === role ? "step" : undefined}>
            <span>
              {icon} {TEXT.ranks[r]}
            </span>
            {r > role && <small>{roleHow(r)}</small>}
            {next?.[0] === r && <progress value={next[1]} max={next[2]} />}
            {brings(r) && <em>{brings(r)}</em>}
          </li>
        ))}
      </ol>
    </div>
  );
}
/** a line said for a few seconds over the wheel (a stage or layer reached, the time away); a screen reader hears it from the
 * region that is always there */
function Toast({ text }: { text: string }) {
  return (
    <>
      {text && (
        <p className="hint toast" aria-hidden="true">
          {text}
        </p>
      )}
      <p className="sr" role="status">
        {text}
      </p>
    </>
  );
}
/** the tabs after the club's: the projects, the exchange, the district and the year */
function Later({ g, tab, act, now, onHand }: { g: Game; tab: number; act: Act; now: number; onHand: () => void }) {
  if (tab === 2) return <Projects g={g} act={act} now={now} />;
  if (tab === 3) return <Exchange g={g} act={act} />;
  if (tab === 4) return <District g={g} act={act} />;
  return tab === 5 ? <Year g={g} act={act} onHand={onHand} /> : null;
}
/** the stage's look at the wheel's speed (turns a second, as drawn): its glow, and a motion blur only once it spins faster than
 * 3 turns a second (near the end, idle() keeps it slower before) */
const speedLook = (w: number): CSSProperties =>
  ({
    "--w": Math.min(Math.abs(w) / 4, 1),
    "--blur": Math.min(Math.max((Math.abs(w) - 3) / 3, 0), 1),
  }) as CSSProperties;
/** how much bigger the club's members draw the wheel: 0 alone, 1 at 64 members */
const big = (g: Game): number => Math.min(Math.log2(Math.max(heads(g), 1)) / 6, 1);
/** before the very first tap of a game from zero (a new year or a club founded again starts at stage 8, and needs no hint) */
const untapped = (g: Game): boolean => !g.all && g.stage === 1;
/** the wheel's classes: new before the first tap; swipe once swiping is bought (it then takes the finger from scrolling) */
const wheelClass = (g: Game): string => `wheel${untapped(g) ? " new" : ""}${g.spin ? " swipe" : ""}`;
/** our wheel alone, cut out of the brand mark */
const WHEEL = "rotaract.svg#svgView(viewBox(320,0,149.3,149.6))";
/** the clubs chartered, as small wheels in a ring round the train, turning with ours */
function Charters({ n, a }: { n: number; a: number }) {
  const shown = Math.min(n, 30);
  return Array.from({ length: shown }, (_, i) => {
    const at = (i / shown) * 2 * Math.PI - Math.PI / 2;
    return (
      <img
        key={i}
        className="chartered"
        src={WHEEL}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ left: `${50 + 45 * Math.cos(at)}%`, top: `${50 + 45 * Math.sin(at)}%`, rotate: `${-a * 360}deg` }}
      />
    );
  });
}
/** a new role, said big over the wheel for a few seconds (tap to close): welcome to your home club (you are a member), or a
 * promotion and what it brings */
function Promo({ role }: { role: number }) {
  const [shown, setShown] = useState(0);
  const was = useRef(role);
  useEffect(() => {
    if (role > was.current) setShown(role);
    was.current = role;
  }, [role]);
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(0), 7000);
    return () => clearTimeout(id);
  }, [shown]);
  const title = shown === 1 ? TEXT.founded.replace("{club}", clubName()) : TEXT.promoted;
  const said = shown ? `${title} ${TEXT.ranks[shown]}. ${TEXT.perks[shown]}` : "";
  return (
    <>
      {/* always there, so that a screen reader hears it fill */}
      <p className="sr" role="status">
        {said}
      </p>
      {shown > 0 && (
        <button type="button" className="promo" onClick={() => setShown(0)}>
          <small>{title}</small>
          <b>
            {ROLE_ICONS[shown]} {TEXT.ranks[shown]}
          </b>
          {TEXT.perks[shown] && <span>{TEXT.perks[shown]}</span>}
        </button>
      )}
    </>
  );
}
/** what is on over the wheel: the talk going on, the District conference and the doubled time after one won */
function Boosts({ g }: { g: Game }) {
  return (
    <div className="boosts">
      {g.talk && (
        <p className="boost">
          🎤 {TEXT.talks[g.talk.k]} · {Math.ceil(g.talk.t)} s
        </p>
      )}
      <ConfLines g={g} />
    </div>
  );
}
/** the District conference going on (its turns so far, its seconds left), and the doubled time after one won */
function ConfLines({ g }: { g: Game }) {
  return (
    <>
      {g.conf && <p className="boost conf">{confLine(g.conf)}</p>}
      {g.boost > 0 && <p className="boost">{TEXT.boostOn.replace("{t}", fmt(g.boost))}</p>}
    </>
  );
}
/** the guest speaker's three talks to pick from */
function Talks({ onPick }: { onPick: (k: number) => void }) {
  return (
    <div className="talks">
      <p>{TEXT.speaker}</p>
      {TEXT.talks.map((name, k) => (
        <button key={name} type="button" onClick={() => onPick(k)}>
          {name}
        </button>
      ))}
    </div>
  );
}
/** the tab bar, from the club on: the n tabs unlocked (TABS_AT), a dot on a tab with something worth a look; toggle buttons, as
 * the app's other segmented bars */
function Tabs({ g, n, tab, set }: { g: Game; n: number; tab: number; set: (t: number) => void }) {
  const dots = news(g);
  return (
    <div className={`seg tabs${n > 3 ? " many" : ""}${n > 4 ? " crowded" : ""}`}>
      {TAB_ICONS.slice(0, n).map((icon, i) => (
        <button key={icon} type="button" aria-pressed={tab === i} onClick={() => set(i)}>
          <span aria-hidden="true">{icon}</span> <span className="lbl">{TEXT.tabs[i]}</span>
          {dots[i] && tab !== i && (
            <i className="dot">
              <span className="sr">{TEXT.dot}</span>
            </i>
          )}
        </button>
      ))}
    </div>
  );
}
/** the upgrades, under the wheel from the first second: a card per one of CARDS reached, in their order for good, the 🔒 card
 * of the next in the place it will take, what comes after the family (the exchange, the district), then what the family does
 * and its mentors; whatever moves still glides there (useFlip) */
function Upgrades({ g, act, bulk }: { g: Game; act: Act; bulk: boolean }) {
  const n = shownCards(g);
  const next = CARDS[n];
  const soon = SOON[g.stage];
  const box = useRef<HTMLDivElement>(null);
  useFlip(box, [...CARDS.slice(0, n).map((c) => c.id), next?.id ?? (soon ? `${g.stage}` : "")].join());
  return (
    <section className="upgrades">
      <h3>⚙️ {TEXT.tabs[0]}</h3>
      <Bulk g={g} act={act} on={bulk} />
      <div className="ups" ref={box}>
        {CARDS.slice(0, n).map((c) => (
          <Card key={c.id} id={c.id} g={g} act={act} />
        ))}
        {/* one 🔒 card at the end: the next card, else what comes after the family; so nothing is ever put before another */}
        {next ? (
          <Locked key={`lock-${next.id}`} sub={TEXT.locked[1].replace("{n}", fmt(next.at))} />
        ) : (
          soon && <Locked key={`soon-${g.stage}`} {...soon} />
        )}
      </div>
      {g.stage >= 3 && <p>{`${TEXT.family[0]} · ${TEXT.family[1]}`}</p>}
      {g.alum >= 1 && (
        <p>
          {TEXT.mentors.replace("{n}", `${Math.floor(g.alum)}`).replace("{p}", `${Math.round((mentors(g) - 1) * 100)}`)}
        </p>
      )}
    </section>
  );
}
/** what comes after the family's wheels, as a 🔒 card at the end, by stage: the exchange, the district */
const SOON: Record<number, { icon: string; name: string; sub: string }> = {
  5: { icon: "📈", name: TEXT.ex[0], sub: TEXT.locked[1].replace("{n}", fmt(EX_AT)) },
  6: { icon: "🗺️", name: TEXT.tabs[4], sub: TEXT.distLocked },
};
/** upgrade card `id` of CARDS: family wheel i's ("fam" i), or one of the wheel's own */
function Card({ id, g, act }: { id: string; g: Game; act: Act }) {
  if (id.startsWith("fam")) {
    const i = Number(id.slice(3));
    return (
      <Up
        icon={<CogIcon i={i} />}
        name={famName(i)}
        sub={slipWarn(g, i) + mileSub(TEXT.famDo[i]!, g.fam[i]!)}
        price={bulkPrice(g, id)}
        h={g.h}
        n={g.fam[i]}
        k={g.bulk === 1 ? undefined : amount(g, id)}
        onBuy={() => act((x) => buyLevels(x, id))}
      />
    );
  }
  const c = wheelCard(g, id);
  // Hold never lights up before Swipe is bought
  return <Up {...c} h={id === "hold" && !g.spin ? 0 : g.h} onBuy={() => act(c.buy)} />;
}
/** a family wheel too strong for the one it drives: which to raise, first on its card */
const slipWarn = (g: Game, i: number): string =>
  slipping(g, i) ? `${TEXT.slip.replace("{w}", famName(MESH[i]!))} · ` : "";
/** a card's effect, and its next milestone (at `most` levels at the most) */
const mileSub = (sub: string, n: number, most = Infinity): string => {
  const m = nextMile(n);
  return m && m <= most ? `${sub} · ${TEXT.upMile.replace("{n}", `${m}`)}` : sub;
};
/** what the wheel's own cards say, cost and buy: Handshake, Momentum, Swipe, Hold (price null once bought for good) */
function wheelCard(
  g: Game,
  id: string,
): { icon: string; name: string; sub: string; price: number | null; n?: number; k?: number; buy: (g: Game) => Game } {
  const buy = (x: Game) => buyLevels(x, id);
  const k = amount(g, id);
  const many = g.bulk === 1 ? undefined : k;
  if (id === "grip") {
    const sub = TEXT.grip[1].replace("{a}", fmt(perTurn(g))).replace("{b}", fmt(perTurn({ ...g, grip: g.grip + k })));
    return {
      icon: "🤝",
      name: TEXT.grip[0],
      sub: mileSub(sub, g.grip),
      price: bulkPrice(g, id),
      n: g.grip,
      k: many,
      buy,
    };
  }
  if (id === "oil") {
    // two decimals, so every level shows; at the most only what it is
    const secs = (x: Game) => glide(x).toFixed(2);
    const sub = k
      ? TEXT.oil[1].replace("{a}", secs(g)).replace("{b}", secs({ ...g, oil: g.oil + k }))
      : TEXT.oil[1].replace(/\{a\}.*\{b\}/, secs(g));
    return {
      icon: "🌀",
      name: TEXT.oil[0],
      sub: mileSub(sub, g.oil, OIL_MAX),
      price: k ? bulkPrice(g, id) : null,
      n: g.oil,
      k: many,
      buy,
    };
  }
  if (id === "swipe") {
    const swipe = (x: Game) => (x.spin ? x : buySpin(x));
    return { icon: "👆", name: TEXT.swipe[0], sub: TEXT.swipe[1], price: g.spin ? null : SPIN[1][1], buy: swipe };
  }
  return { icon: "✊", name: TEXT.hold[0], sub: TEXT.hold[1], price: g.spin >= 2 ? null : SPIN[2][1], buy: buyHold };
}
/** the club folded: in place of the game, until a new one is founded; its button takes the focus */
function Folded({ onAgain }: { onAgain: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => btn.current?.focus(), []);
  return (
    <div className="folded" role="alert">
      <span aria-hidden="true">💔</span>
      <h3>{TEXT.folded[0]}</h3>
      <p>{TEXT.folded[1]}</p>
      <button ref={btn} className="btn" type="button" onClick={onAgain}>
        {TEXT.folded[2]}
      </button>
    </div>
  );
}
/** what the club's members unlock next: the projects, then the Avenues, as [icon, name, members] */
const nextGate = (g: Game): [string, string, number] | null => {
  if (g.stage < 4) return ["🧤", TEXT.tabs[2], GATE.proj];
  return g.stage < 5 ? ["🧭", TEXT.avenues, GATE.av] : null;
};
/** the club: your club, its crowd (the one place its members show), whose faces show how tired it is (and of what kind they
 * are), the energy bar, what the members unlock next, and what hours do for it; then the Avenues */
function Club({ g, act }: { g: Game; act: Act }) {
  const n = heads(g);
  const face = faceOf(g);
  const pct = Math.round(g.en * 100);
  const gate = nextGate(g);
  return (
    <>
      <section className={g.en < LOW ? "club low" : "club"}>
        <header>
          <small>{TEXT.yourClub}</small>
          <h3>🏛️ {clubName()}</h3>
        </header>
        <div className="crowd">
          <b>
            👥 {n} {TEXT.members}
          </b>
          <div aria-hidden="true">
            {crowd(g, Math.min(n, 24)).map((k, i) => (
              <span key={i} className={`k${k}`} style={{ "--i": i } as CSSProperties}>
                {face}
              </span>
            ))}
            {n > 24 && <em>+{n - 24}</em>}
          </div>
        </div>
        <div className="energy" style={{ "--en": g.en } as CSSProperties}>
          <span aria-hidden="true">⚡</span>
          <div role="meter" aria-label={TEXT.energy} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <b>{pct} %</b>
        </div>
        {gate && (
          <div className="next">
            <span>{TEXT.next.replace("{r}", `${gate[0]} ${gate[1]}`).replace("{n}", `${gate[2]}`)}</span>
            <progress value={n} max={gate[2]} />
          </div>
        )}
        <p className="warn" aria-live="polite">
          {g.en < LOW ? TEXT.leaving : ""}
        </p>
        <div className="ups">
          <Up
            icon="📣"
            name={TEXT.recruit[0]}
            sub={TEXT.recruit[1]}
            price={recruitPrice(g)}
            h={g.h}
            onBuy={() => act(recruit)}
          />
          <Up
            icon="🍻"
            name={TEXT.social[0]}
            sub={TEXT.social[1]}
            price={g.en >= 1 ? null : socialPrice(g)}
            h={g.h}
            onBuy={() => act(social)}
          />
          {g.stage >= 4 && g.soc === null && (
            <Up
              icon="🤖"
              name={TEXT.socCom[0]}
              sub={TEXT.socCom[1]}
              price={socComPrice(g)}
              h={g.h}
              onBuy={() => act(buySocCom)}
            />
          )}
        </div>
        {g.soc !== null && <Switch label={`🍻🤖 ${TEXT.socCom[0]}`} on={g.soc} onFlip={() => act(flipSoc)} />}
      </section>
      {g.stage >= 5 && <Avenues g={g} act={act} />}
    </>
  );
}
/** the Avenues of Service: the points to give, the club's mix of kinds as one bar, and a slider per Avenue with the share of
 * its kind */
function Avenues({ g, act }: { g: Game; act: Act }) {
  const most = points(g);
  return (
    <section className="avenues">
      <h3>🧭 {TEXT.avenues}</h3>
      <p className="pts">{TEXT.pts.replace("{n}", `${ptsLeft(g)}`).replace("{m}", `${most}`)}</p>
      <Mix g={g} />
      {AV_ICONS.map((icon, k) => (
        <label key={icon} className={`av k${k}`}>
          <i aria-hidden="true">{icon}</i>
          <b>{TEXT.av[k]}</b>
          <small>{TEXT.avDo[k]}</small>
          <input
            type="range"
            min={0}
            max={most}
            value={g.pts[k]}
            onChange={(ev) => {
              const v = Number(ev.target.value);
              act((x) => setPts(x, k, v));
            }}
          />
          <strong>{g.pts[k]}</strong>
        </label>
      ))}
    </section>
  );
}
/** who the club is: its members by kind as one stacked bar, and each kind there is with its share */
function Mix({ g }: { g: Game }) {
  const parts = mix(g);
  const all = parts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="mix">
      <div className="bar" aria-hidden="true">
        {parts.map((p, k) => (p > 0 ? <i key={k} className={`k${k}`} style={{ flexGrow: p }} /> : null))}
      </div>
      <ul>
        {parts.map((p, k) =>
          p >= 0.05 ? (
            <li key={k} className={`k${k}`}>
              {AV_ICONS[k] ?? "👤"} {TEXT.kinds[k]} {Math.round((p / all) * 100)} %
            </li>
          ) : null,
        )}
      </ul>
      <small>{TEXT.mix}</small>
    </div>
  );
}
/** the projects tab: the free members, a real event of your clubs coming up, the projects shown so far and a locked card for
 * the next one */
function Projects({ g, act, now }: { g: Game; act: Act; now: number }) {
  const n = shownProj(g);
  const on = working(g);
  const D = loaded ? getData() : null;
  const ev = D && (g.ev ? eventById(D, g.ev.id) : realEvent(D.data.events, myClubs(D), now, g.evs));
  return (
    <section className="projects">
      <Bulk g={g} act={act} />
      <p className="free">{TEXT.free.replace("{n}", `${free(g)}`)}</p>
      {ev && best(g) > 0 && (
        <Run
          className="proj event"
          icon="🎟️"
          name={ev.title}
          sub={`+${fmt(EVENT.times * best(g))} · ${TEXT.event[1].replace("{d}", new Date(ev.start).toLocaleDateString(LOCALE, { day: "numeric", month: "short" }))}`}
          fill={g.ev ? g.ev.t / EVENT.secs : 0}
          can={startEvent(g, ev.id) !== g}
          note={`${TEXT.event[0]} · 👥 ${EVENT.crew}`}
          onRun={() => act((x) => startEvent(x, ev.id))}
        />
      )}
      {PROJ.slice(0, n).map((_, i) => (
        <Project key={i} g={g} i={i} on={on[i]!} act={act} />
      ))}
      {n < PROJ.length && <Locked sub={TEXT.locked[1].replace("{n}", fmt(PROJ[n]!.price / 2))} />}
    </section>
  );
}
/** the line under a project's bar: a committee switched on but waiting for members, and the next milestone */
function note(g: Game, i: number, on: boolean): string {
  const mile = MILES.find((m) => m > g.own[i]!);
  const wait = g.com[i] && !g.off[i] && !on;
  return [wait && TEXT.paused, mile && TEXT.mile.replace("{n}", `${mile}`)].filter(Boolean).join(" · ");
}
/** why project i can't be run by hand now, in a few words: none owned, or its crew not free ("" while it runs, or when it can) */
function whyNot(g: Game, i: number): string {
  if (!g.own[i]) return TEXT.first;
  return g.run[i]! < 0 && free(g) < PROJ[i]!.crew ? TEXT.need.replace("{n}", `${PROJ[i]!.crew}`) : "";
}
/** a project as a card with its buttons inside: buy one more, run it by hand (or why not) and buy its committee, or once a
 * committee runs it, its Auto switch (it costs the club energy, so it may be paused) */
function Project({ g, i, on, act }: { g: Game; i: number; on: boolean; act: Act }) {
  const own = g.own[i]!;
  const len = runTime(g, i);
  // a committee's runs too fast to see fill: a full bar
  const fill = on && len < 0.5 ? 1 : Math.max(g.run[i]!, 0) / len;
  const why = whyNot(g, i);
  const id = `proj${i}`;
  const price = bulkPrice(g, id);
  return (
    <div className={`proj${on ? " auto" : ""}${own ? "" : " none"}`} role="group" aria-label={TEXT.proj[i]}>
      <i aria-hidden="true">{PROJ_ICONS[i]}</i>
      <b>{TEXT.proj[i]}</b>
      <small>{TEXT.per.replace("{n}", fmt(own ? perRun(g, i) : PROJ[i]!.brings))}</small>
      <span className="bar" aria-hidden="true">
        <span style={{ width: `${Math.min(fill, 1) * 100}%` }} />
      </span>
      {own > 0 && note(g, i, on) && <em>{note(g, i, on)}</em>}
      {own > 0 && <strong>×{own}</strong>}
      <div className="buys">
        <Buy
          label={g.bulk === 1 ? TEXT.buy : `${TEXT.buy} ×${amount(g, id)}`}
          price={price}
          can={g.h >= price}
          onBuy={() => act((x) => buyLevels(x, id))}
        />
        {g.com[i] ? (
          <Switch label={TEXT.auto} on={!g.off[i]} onFlip={() => act((x) => flipCom(x, i))} />
        ) : (
          <>
            <button
              type="button"
              className="go"
              aria-disabled={startRun(g, i) === g}
              onClick={() => act((x) => startRun(x, i))}
            >
              {TEXT.run}
              {why && <span className="why">{why}</span>}
            </button>
            {own > 0 && (
              <Buy
                label={`🤖 ${TEXT.com[0]}`}
                price={comPrice(i)}
                can={buyCom(g, i) !== g}
                onBuy={() => act((x) => buyCom(x, i))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
/** an on/off switch (a committee's Auto, the Social committee) */
function Switch({ label, on, onFlip }: { label: string; on: boolean; onFlip: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="switch" onClick={onFlip}>
      {label}
      <i aria-hidden="true" />
    </button>
  );
}
/** the real event as a card like a project's: its bar fills while it runs, and its Run button inside */
function Run(p: {
  className: string;
  icon: string;
  name: string;
  sub: string;
  fill: number;
  /** whether its Run button starts a run now */
  can: boolean;
  note: string;
  onRun: () => void;
}) {
  return (
    <div className={p.className} role="group" aria-label={p.name}>
      <i aria-hidden="true">{p.icon}</i>
      <b>{p.name}</b>
      <small>{p.sub}</small>
      <span className="bar" aria-hidden="true">
        <span style={{ width: `${Math.min(p.fill, 1) * 100}%` }} />
      </span>
      {p.note && <em>{p.note}</em>}
      <div className="buys">
        <button type="button" className="go" aria-disabled={!p.can} onClick={p.onRun}>
          {TEXT.run}
        </button>
      </div>
    </div>
  );
}
/** a small buy button: what it buys and its price, lit once it can be bought (can) */
function Buy({ label, price, can, onBuy }: { label: string; price: number; can: boolean; onBuy: () => void }) {
  return (
    <button type="button" className="buy" aria-disabled={!can} onClick={onBuy}>
      {label}
      <span className="sr"> · </span>
      <b>{fmt(price)}</b>
    </button>
  );
}
