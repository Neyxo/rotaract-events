// The idle clicker's exchange tab (stage 6): other clubs' projects as stocks, and the Foundation. The sums are in ./game.
import { getData, loaded } from "../../lib/data";
import { buyStock, deposit, FUND, fundBack, type Game, MARKET, price, sellAll, worth } from "./game";
import { fmt, TEXT } from "./text";

type Act = (f: (g: Game) => Game) => void;
/** n of the app's real clubs from the `from`th on (the exchange's five first), the player's home club left out; "Rotaract 1…5"
 * while the data is not in */
export function clubNames(n = MARKET.vol.length, from = 0): string[] {
  const d = loaded ? getData() : null;
  const home = d?.clubs[d.settings.home]?.name;
  const names = d
    ? Object.values(d.clubs)
        .map((c) => c.name)
        .filter((n) => n !== home)
    : [];
  return Array.from({ length: n }, (_, i) => names[from + i] ?? `Rotaract ${from + i + 1}`);
}
/** a gain in green with a plus, a loss in red with a minus; as time, or as a share (pct) */
const signed = (n: number, pct = false) => (
  <span className={n < 0 ? "loss" : "gain"}>
    {n < 0 ? "−" : "+"}
    {pct ? `${(Math.abs(n) * 100).toFixed(1)} %` : fmt(Math.abs(n))}
  </span>
);
/** the prices shown, MARKET.keep of them: the first repeated before there are that many, so the line spans the card from the
 * start */
export const spanned = (px: number[]): number[] => [
  ...Array.from({ length: Math.max(MARKET.keep - px.length, 0) }, () => px[0] ?? 1),
  ...px,
];

/** the exchange: a card per club with its sparkline, then the Foundation */
export function Exchange({ g, act }: { g: Game; act: Act }) {
  const names = clubNames();
  return (
    <section className="exchange">
      <h3>📈 {TEXT.ex[0]}</h3>
      <p>{TEXT.ex[1]}</p>
      <p className="risk">{TEXT.risk}</p>
      {names.map((name, i) => (
        <Stock key={name} g={g} i={i} name={name} act={act} />
      ))}
      <Fund g={g} act={act} />
    </section>
  );
}
/** one club's stock: its name, how wild it is (🌶️ per step of swing), its price and move over the line, the price's last
 * moves; what is held, up or down in time since bought; the buttons, saying what they put in or bring */
function Stock({ g, i, name, act }: { g: Game; i: number; name: string; act: Act }) {
  const px = g.px[i]!;
  const now = price(g, i);
  const move = now / (px[0] ?? now) - 1;
  const held = worth(g, i);
  const paid = g.paid[i]!;
  const has = g.sh[i]! > 0;
  return (
    <div className="stock">
      <b>{name}</b>
      <small title={TEXT.riskOf.replace("{n}", `${i + 1}`)}>
        <span aria-hidden="true">{"🌶️".repeat(i + 1)}</span>
        <span className="sr">{TEXT.riskOf.replace("{n}", `${i + 1}`)}</span>
      </small>
      <p className="px">
        <span className="sr">{TEXT.px} </span>×{now.toFixed(2)} {signed(move, true)}
      </p>
      <Spark px={px} up={move >= 0} />
      {/* there from the start, hidden until something is held, and always two lines (what is held, then the gain), so buying
          moves nothing below at any width */}
      <p className={has ? "held" : "held none"} aria-hidden={!has}>
        {TEXT.held.replace("{n}", fmt(held))}
        <br />
        {signed(held - paid)} ({signed(paid ? held / paid - 1 : 0, true)})
      </p>
      <div className="buys">
        {[0.1, 0.5].map((part) => (
          <button
            key={part}
            type="button"
            className="buy"
            aria-disabled={g.h * part < 1}
            onClick={() => act((x) => buyStock(x, i, part))}
          >
            {TEXT.invest.replace("{p} ", `${part * 100}\u00a0`).replace("{p}", `${part * 100}`)}
            <span className="sr"> · </span>
            <b>{fmt(g.h * part)}</b>
          </button>
        ))}
        <button type="button" className="buy sell" aria-disabled={!has} onClick={() => act((x) => sellAll(x, i))}>
          {TEXT.sell}
          <span className="sr"> · </span>
          <b>{has ? fmt(held) : "—"}</b>
        </button>
      </div>
    </div>
  );
}
/** the last prices as a line, from lowest to highest, green when up since the first and red when down */
function Spark({ px, up }: { px: number[]; up: boolean }) {
  const all = spanned(px);
  const lo = Math.min(...all);
  const span = Math.max(...all) - lo;
  // flat (nothing moved yet): along the middle
  const y = (p: number) => (span ? 28 - ((p - lo) / span) * 26 : 15);
  const pts = all.map((p, j) => `${(j / Math.max(all.length - 1, 1)) * 100},${y(p)}`).join(" ");
  return (
    <svg
      className={up ? "spark gain" : "spark loss"}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
/** the Foundation: give a quarter of the time, back with a gain after FUND.secs; the deposits on their way back */
function Fund({ g, act }: { g: Game; act: Act }) {
  const put = g.h / 4;
  const full = g.dep.length >= FUND.most;
  return (
    <div className="stock fund">
      <b>🌍 {TEXT.fund[0]}</b>
      <small>{TEXT.fund[1].replace("{x}", fundBack(g).toFixed(2)).replace("{t}", fmt(FUND.secs))}</small>
      {g.dep.map((d, j) => (
        <p key={j} className="dep">
          <span className="bar" aria-hidden="true">
            <span style={{ width: `${(1 - d.t / FUND.secs) * 100}%` }} />
          </span>
          {fmt(d.n * fundBack(g))} · {Math.ceil(d.t)} s
        </p>
      ))}
      <div className="buys">
        <button type="button" className="buy" aria-disabled={full || put < 1} onClick={() => act(deposit)}>
          {TEXT.fund[2].replace("{n}", fmt(put))}
          <span className="sr"> · </span>
          <b>
            {g.dep.length}/{FUND.most}
          </b>
        </button>
      </div>
    </div>
  );
}
