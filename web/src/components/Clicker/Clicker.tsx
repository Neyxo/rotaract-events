// Easter egg: an idle clicker. Turn the Rotaract wheel for "service hours", spend them on helpers that earn hours by themselves
// (also while the app is closed, up to eight hours), and rise from guest to RI president. Opened by the Rütli oath (components/Oath).
// Everything of it is in this file and Clicker.css, texts in the four languages included (not in i18n/): it is fetched on the oath,
// so the app's first load carries none of it. The state is one localStorage value, rac.clicker.
import { useEffect, useRef, useState } from "react";
import "./Clicker.css";
import { LANG, LOCALE } from "../../i18n";
import { store, type StoreKeys } from "../../lib/store";
import { Popup } from "../Popup/Popup";

type Game = StoreKeys["rac.clicker"];
/** what the hours buy: [hours per second, first price]; every further one of a kind costs 15 % more */
const SHOP = [
  [1, 15],
  [8, 150],
  [50, 1500],
  [300, 20000],
] as const;
/** the hours ever earned (g.all) at which the next title begins */
const RANKS = [0, 100, 1e3, 1e4, 1e5, 1e6];
const TEXT = {
  en: {
    title: "Service hours",
    sec: "{n} per second",
    tap: "Turn the wheel",
    reset: "Start over",
    shop: ["Volunteer", "Apéro", "Hands-on project", "District conference"],
    ranks: ["Guest", "Member", "Paul Harris Fellow", "President", "District Governor", "RI President"],
  },
  de: {
    title: "Service-Stunden",
    sec: "{n} pro Sekunde",
    tap: "Rad drehen",
    reset: "Neu anfangen",
    shop: ["Freiwillige", "Apéro", "Hands-on-Projekt", "Distriktkonferenz"],
    ranks: ["Gast", "Mitglied", "Paul Harris Fellow", "Präsidium", "Distrikt-Governor", "RI-Präsidium"],
  },
  fr: {
    title: "Heures de service",
    sec: "{n} par seconde",
    tap: "Tourner la roue",
    reset: "Recommencer",
    shop: ["Bénévole", "Apéro", "Action sur le terrain", "Conférence de district"],
    ranks: ["Invité", "Membre", "Paul Harris Fellow", "Présidence", "Gouverneur de district", "Présidence du RI"],
  },
  it: {
    title: "Ore di servizio",
    sec: "{n} al secondo",
    tap: "Gira la ruota",
    reset: "Ricomincia",
    shop: ["Volontario", "Aperitivo", "Progetto sul campo", "Congresso distrettuale"],
    ranks: ["Ospite", "Socio", "Paul Harris Fellow", "Presidenza", "Governatore distrettuale", "Presidenza del RI"],
  },
}[LANG];
const NUM = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });

export const fresh = (now: number): Game => ({ h: 0, all: 0, own: SHOP.map(() => 0), at: now });
/** hours per second */
export const rate = (g: Game): number => SHOP.reduce((s, [r], i) => s + r * (g.own[i] ?? 0), 0);
export const cost = (g: Game, i: number): number => Math.ceil(SHOP[i]![1] * 1.15 ** (g.own[i] ?? 0));
/** adds what the helpers earned since g.at: at most eight hours' worth, however long the app was closed */
export function tick(g: Game, now: number): Game {
  const add = rate(g) * Math.min(Math.max(now - g.at, 0) / 1000, 8 * 3600);
  return { ...g, h: g.h + add, all: g.all + add, at: now };
}
/** one turn of the wheel: an hour, and a tenth of what a second earns */
export const turn = (g: Game): Game => {
  const add = 1 + Math.floor(rate(g) / 10);
  return { ...g, h: g.h + add, all: g.all + add };
};
/** one more of kind i, if the hours pay for it */
export const buy = (g: Game, i: number): Game => {
  const c = cost(g, i);
  return g.h < c ? g : { ...g, h: g.h - c, own: g.own.map((n, j) => n + +(j === i)) };
};

export default function Clicker({ onClose }: { onClose: () => void }) {
  const [g, setG] = useState(() => tick(store.get("rac.clicker", null) ?? fresh(Date.now()), Date.now()));
  const [turns, setTurns] = useState(0),
    last = useRef(g);
  last.current = g;
  // a tick a second while it is open; saved when it closes or the page goes away, not every second (a save re-renders the app)
  useEffect(() => {
    const id = setInterval(() => setG((x) => tick(x, Date.now())), 1000),
      save = () => store.set("rac.clicker", last.current);
    addEventListener("pagehide", save);
    return () => {
      clearInterval(id);
      removeEventListener("pagehide", save);
      save();
    };
  }, []);
  const rank = RANKS.findLastIndex((r) => g.all >= r);
  return (
    <Popup
      title={TEXT.title}
      onClose={onClose}
      className="ob clicker"
      action={
        <button className="skip" type="button" onClick={() => setG(fresh(Date.now()))}>
          {TEXT.reset}
        </button>
      }
    >
      <p className="n">{NUM.format(Math.floor(g.h))}</p>
      <p>
        {TEXT.ranks[rank]} · {TEXT.sec.replace("{n}", NUM.format(rate(g)))}
      </p>
      <button
        className="wheel"
        type="button"
        aria-label={TEXT.tap}
        onClick={() => {
          setG(turn);
          setTurns((n) => n + 1);
        }}
      >
        {/* the wheel alone, cut out of the brand mark; each tap turns it one cog further */}
        <img
          src="rotaract.svg#svgView(viewBox(320,0,149.3,149.6))"
          alt=""
          style={{ transform: `rotate(${turns * 15}deg)` }}
        />
      </button>
      <div className="shop">
        {SHOP.map(([r], i) => (
          <button key={i} type="button" aria-disabled={g.h < cost(g, i)} onClick={() => setG((x) => buy(x, i))}>
            <b>
              {TEXT.shop[i]}
              {g.own[i] ? " × " + g.own[i] : ""}
            </b>
            <span>
              +{r}/s · {NUM.format(cost(g, i))}
            </span>
          </button>
        ))}
      </div>
    </Popup>
  );
}
