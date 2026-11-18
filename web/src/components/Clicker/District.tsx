// The idle clicker's district tab (stage 7: chartering, the layers, the District conference) and year tab (stage 8: the people
// helped, this year's votes, the handover (./Ceremony) and what helpers buy). The sums are in ./game.
import type { CSSProperties } from "react";
import { motions } from "./Ceremony";
import { clubNames } from "./Exchange";
import {
  buyPerm,
  CHARTER,
  CONF,
  canCharter,
  canConf,
  charter,
  charterPrice,
  founders,
  fresh,
  type Game,
  HAND_AT,
  helped,
  LAYER,
  layer,
  MARKET,
  PERM,
  permPrice,
  startConf,
} from "./game";
import { fmt, TEXT } from "./text";
import { type Act, Locked, Up } from "./ui";

/** how many chartered clubs are named on the tab; the rest are a count */
const NAMED = 12;
const PERM_ICONS = ["🧠", "💰", "🤝", "🧑‍🏫"];

/** the district tab: the layer reached and the next, the clubs chartered, chartering one more, the conference */
export function District({ g, act }: { g: Game; act: Act }) {
  const l = layer(g);
  const next = LAYER.at[l + 1];
  const names = clubNames(Math.min(g.chart, NAMED), MARKET.vol.length);
  const full = g.chart >= CHARTER.per * g.fam[6]!;
  return (
    <section className="district">
      <h3>🗺️ {TEXT.layers[l]}</h3>
      <p>{TEXT.chartered.replace("{n}", `${g.chart}`).replace("{r}", `${LAYER.reach[l]}`)}</p>
      {next !== undefined && (
        <div className="next">
          <span>{TEXT.nextLayer.replace("{l}", TEXT.layers[l + 1]!).replace("{n}", `${next}`)}</span>
          <progress value={g.chart} max={next} />
        </div>
      )}
      {g.chart > 0 && (
        <ul
          className="chips"
          aria-label={TEXT.chartered.replace("{n}", `${g.chart}`).replace("{r}", `${LAYER.reach[l]}`)}
        >
          {names.map((n) => (
            <li key={n}>🏛️ {n}</li>
          ))}
          {g.chart > NAMED && <li>+{g.chart - NAMED}</li>}
        </ul>
      )}
      <div className="ups">
        <Up
          icon="🏛️"
          name={TEXT.charter[0]}
          sub={full ? TEXT.charter[2].replace("{n}", `${CHARTER.per}`) : TEXT.charter[1]}
          price={full ? null : charterPrice(g)}
          h={canCharter(g) ? g.h : 0}
          n={g.chart}
          onBuy={() => act(charter)}
        />
        {l >= 1 ? (
          <Conf g={g} act={act} />
        ) : (
          <Locked
            icon="🎤"
            name={TEXT.conf[0]}
            sub={TEXT.nextLayer.replace("{l}", TEXT.layers[1]).replace("{n}", `${LAYER.at[1]}`)}
          />
        )}
        {g.stage === 7 && <Locked icon="🎖" name={TEXT.tabs[5]} sub={TEXT.yearLocked} />}
      </div>
    </section>
  );
}
/** the District conference going on: its turns so far and its seconds left */
export const confLine = (c: { t: number; n: number }): string =>
  TEXT.confOn
    .replace("{n}", `${Math.floor(c.n)}`)
    .replace("{m}", `${CONF.turns}`)
    .replace("{s}", `${Math.ceil(CONF.secs - c.t)}`);
/** the District conference: start it, then CONF.turns turns within CONF.secs double the time for a while */
function Conf({ g, act }: { g: Game; act: Act }) {
  const ready = canConf(g);
  const say = TEXT.conf[1]
    .replace("{n}", `${CONF.turns}`)
    .replace("{s}", fmt(CONF.secs))
    .replace("{t}", fmt(CONF.boost));
  const state = g.conf ? confLine(g.conf) : null;
  return (
    <button
      type="button"
      className="up conf"
      aria-disabled={!ready}
      style={{ "--p": ready ? "100%" : "0%" } as CSSProperties}
      onClick={() => act(startConf)}
    >
      <i aria-hidden="true">🎤</i>
      <b>{TEXT.conf[0]}</b>
      <small>{say}</small>
      <em>{state ?? (ready ? TEXT.conf[2] : TEXT.confWait.replace("{t}", fmt(g.cool)))}</em>
    </button>
  );
}
/** the year tab: the people helped and the helpers, this year's votes, the Hand over button (it opens the ceremony, ./Ceremony),
 * what helpers buy, and at the very bottom a small link to start the whole game over (once sure) */
export function Year({ g, act, onHand }: { g: Game; act: Act; onHand: () => void }) {
  const n = helped(g);
  return (
    <section className="year">
      <p className="heart">
        <b>❤️ {n}</b>
        <small>{TEXT.helped}</small>
      </p>
      {g.helpers > 0 && <p>{TEXT.aid.replaceAll("{n}", `${g.helpers}`)}</p>}
      <h3>🗳️ {TEXT.gaNow}</h3>
      <ul className="ga-now">
        {motions().map((m, k) => {
          const v = g.ga[k]!;
          return (
            <li key={m.name}>
              <small>{m.name}</small>
              <b>{v < 0 ? "—" : (m.labels?.[v] ?? m.chips[v])}</b>
              {v >= 0 && <em>{m.fx[v]}</em>}
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn hand" aria-disabled={n < HAND_AT} onClick={() => n >= HAND_AT && onHand()}>
        🎖 {n < HAND_AT ? TEXT.hand[3].replace("{n}", `${HAND_AT}`) : TEXT.hand[2]}
      </button>
      <small>{TEXT.hand[1].replace("{n}", `${n}`)}</small>
      <small>{TEXT.keep.replace("{n}", `${founders(g.helpers + n)}`)}</small>
      <h3>{TEXT.spend}</h3>
      <div className="ups">
        {PERM.map((p, k) => {
          const max = g.perm[k]! >= p.most;
          return (
            <Up
              key={k}
              icon={PERM_ICONS[k]!}
              name={TEXT.perm[k]![0]}
              sub={TEXT.perm[k]![1]}
              price={max ? null : permPrice(g, k)}
              h={g.helpers}
              n={g.perm[k]}
              cost={`${permPrice(g, k)} ❤️`}
              onBuy={() => act((x) => buyPerm(x, k))}
            />
          );
        })}
      </div>
      <button
        className="link reset"
        type="button"
        onClick={() => {
          if (!confirm(TEXT.sure)) return;
          const now = Date.now();
          act((x) => ({ ...fresh(now), sfx: x.sfx, music: x.music }));
        }}
      >
        {TEXT.reset}
      </button>
    </section>
  );
}
