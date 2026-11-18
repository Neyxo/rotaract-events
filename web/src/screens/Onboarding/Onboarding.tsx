// The welcome steps: the onboarding dialog Home opens on the first visit, from ?welcome and from "Get started".
// In the browser it first shows how to install the app (step -1); installed, it stops there: the welcome goes on in the app.
// A member: welcome, clubs, good to know, calendar. A guest: welcome, three slides, clubs near.
import { useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { t, tx } from "../../i18n";
import { club, getData, isRac, myClubs, setSettings, withAlsoToggled, withHome } from "../../lib/data";
import { BRAND, cx, vars } from "../../lib/color";
import { guessClubs } from "../../lib/geo";
import { appUrl, chromeInstead, chromeUrl, howKey, install, isInstalled, openAppUrl, samsung } from "../../lib/install";
import { guessOS } from "../../lib/geo";
import type { Pillar } from "../../lib/pillars";
import { store } from "../../lib/store";
import type { Settings } from "../../lib/types";
import {
  ClubChips,
  copy,
  feedsFor,
  Icon,
  PillarPic,
  toast,
  useData,
  useInstallPrompt,
  useInstallState,
  useModal,
  useSubFlow,
  type IconName,
} from "../../components";

interface Ob {
  /** the clubs being chosen; saved on finish */
  s: Settings;
  /** null on the first step, which asks */
  member: boolean | null;
  /** -1: the app first (in a browser) */
  step: number;
  /** clubs near the approximate position (or per language) */
  guess: string[];
  /** finished: the dialog stays closed, its last step still in it */
  done?: boolean;
}

function ObNav({
  next,
  skip,
  onNext,
  onSkip,
}: {
  next: string;
  skip?: string;
  onNext: () => void;
  onSkip?: () => void;
}) {
  return (
    <div className="nav">
      {skip ? (
        <button className="skip" type="button" onClick={onSkip}>
          {skip}
        </button>
      ) : (
        <span />
      )}
      <button className="btn" type="button" onClick={onNext}>
        {next}
      </button>
    </div>
  );
}

/** a drawn arrow from the middle of the screen up to its top right corner, where Samsung Internet's address bar has the app's icon:
 *  a loop on the way, a thin glow under it, drawn in once (still with reduced motion) */
function ToIcon() {
  return (
    <svg className="toicon" viewBox="0 0 200 320" aria-hidden="true">
      <path
        className="glow"
        d="M24 312C8 236 92 230 104 182C114 140 70 124 62 156C54 190 120 196 150 140C172 98 178 62 180 22"
      />
      <path
        className="line"
        d="M24 312C8 236 92 230 104 182C114 140 70 124 62 156C54 190 120 196 150 140C172 98 178 62 180 22"
      />
      <path className="head" d="M158 46L180 18L198 50" />
    </svg>
  );
}

/** The arrow alone, over the page, from Settings' "Open the app" in Samsung Internet: the app it installed opens from its icon only */
export function IconHint({ onClose }: { onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const h2 = useRef<HTMLHeadingElement>(null);
  useModal(dlg, true, { focus: h2 });
  return createPortal(
    <dialog className="ob point" ref={dlg} onClose={onClose} aria-labelledby="iconHint">
      <div className="ob-in">
        <ToIcon />
        <h2 id="iconHint" tabIndex={-1} ref={h2}>
          {t("ob_open")}
        </h2>
        <p>{t("ob_open_samsung")}</p>
        <button className="skip web faint" type="button" onClick={() => dlg.current?.close()}>
          {t("close")}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

/** The app first, and how to get it at once, nothing to tap before: with the browser's prompt one big button that installs, in
 *  whatever browser this is; without one (iPhone, Firefox, DuckDuckGo, inside another app) this system's three steps, with the
 *  way to the browser they name: a link to Chrome on Android, and the address to copy. Below, a faint way past it. Installed, the
 *  website's part is over: a button that opens the app where a page can (Chrome on Android; in Samsung Internet only its own app
 *  icon in the address bar does), and the way back here small enough to miss. Between the two, while the phone adds the app, a wait. */
function InstallStep({ title, onWeb }: { title: (text: string) => ReactNode; onWeb: () => void }) {
  const prompt = useInstallPrompt();
  const state = useInstallState();
  if (state === "installing")
    return (
      <>
        {title(t("ob_installing"))}
        <p>{t("ob_installing_t")}</p>
      </>
    );
  // Samsung Internet: no link can open the app it installed, only its own icon in the address bar, up there: an arrow to it
  if (state === "installed" && samsung())
    return (
      <>
        <ToIcon />
        {title(t("ob_inst_done"))}
        <p>{t("ob_open_samsung")}</p>
        <button className="skip web faint" type="button" onClick={onWeb}>
          {t("ob_web_back")}
        </button>
      </>
    );
  if (state === "installed") {
    const open = openAppUrl();
    return (
      <>
        {title(t("ob_inst_done"))}
        <p>{t("ob_inst_done_t")}</p>
        {open && (
          <a className="btn big" href={open}>
            {t("ob_open")}
          </a>
        )}
        <button className="skip web faint" type="button" onClick={onWeb}>
          {t("ob_web_back")}
        </button>
      </>
    );
  }
  // Samsung Internet: Chrome first (the app opens from there, and Samsung's forced dark mode doesn't reach it), here second
  const chrome = chromeInstead();
  return (
    <>
      {title(t("ob_inst"))}
      <p>{t("ob_inst_t")}</p>
      {chrome && (
        <>
          <div className="choice">
            <a className="btn big" href={chrome}>
              {t("inst_in_chrome")}
            </a>
          </div>
          <p className="meta">{t("inst_chrome_why")}</p>
        </>
      )}
      {prompt ? (
        <div className="choice">
          <button className={chrome ? "btn big alt" : "btn big"} type="button" onClick={() => void install()}>
            {chrome ? t("inst_here") : t("inst_btn")}
          </button>
        </div>
      ) : (
        <>
          {chrome && <p>{t("inst_here_steps")}</p>}
          <ol className="qsteps">
            {tx(howKey(guessOS())).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="links">
            {chromeUrl() && (
              <a className="linkbtn primary" href={chromeUrl()!}>
                <Icon name="ext" />
                {t("inst_chrome")}
              </a>
            )}
            <button className="linkbtn" type="button" onClick={() => void copy(appUrl())}>
              {t("copy_link")}
            </button>
          </div>
          <p>{t("ob_inst_then")}</p>
        </>
      )}
      <button className="skip web" type="button" onClick={onWeb}>
        {t("ob_web")}
      </button>
    </>
  );
}

const FACT_IC: IconName[] = ["eye", "refresh", "ext"];
/** the calendar step: the same flow as everywhere, for the clubs just chosen; "Not now" and its end both finish the welcome */
function SubStep({ ids, title, onDone }: { ids: string[]; title: (text: string) => ReactNode; onDone: () => void }) {
  const f = useSubFlow(feedsFor(useData(), ids), { pickTitle: t("ob_sub") });
  return (
    <>
      <div className="obhead">
        {f.back && (
          <button className="obback" type="button" aria-label={t("back")} onClick={f.back}>
            <Icon name="back" />
          </button>
        )}
        {title(f.title)}
      </div>
      {f.body}
      <div className="nav">
        {f.finished ? (
          <span />
        ) : (
          <button className="skip" type="button" onClick={onDone}>
            {t("not_now")}
          </button>
        )}
        {f.finished ? (
          <button className="btn" type="button" onClick={onDone}>
            {t("done")}
          </button>
        ) : (
          f.primary
        )}
      </div>
    </>
  );
}

const SLIDES: [k: "who" | "what" | "how", color: string, pic: Pillar][] = [
  ["who", BRAND.azure, "learn"],
  ["what", BRAND.green, "help"],
  ["how", BRAND.cranberry, "party"],
];
const PILLARS: [Pillar, string][] = [
  ["learn", BRAND.azure],
  ["help", BRAND.green],
  ["party", BRAND.cranberry],
];
const SLIDE_TITLE = { who: "ob_who", what: "ob_what", how: "ob_how" } as const;

/** a guest's slides 1-3: who we are, what we do, how to start */
function Slide({ step, title }: { step: number; title: ReactNode }) {
  const [k, color, pic] = SLIDES[step - 1]!;
  return (
    <div className="slide" style={vars({ "--p": color })}>
      <PillarPic k={pic} />
      {title}
      {k === "what" ? (
        <div className="pill">
          {PILLARS.map(([w, c]) => (
            <p key={w} style={vars({ "--p": c })}>
              <b>{t(`ab_${w}`) + "."}</b>
              {" " + t(`ab_${w}_t`)}
            </p>
          ))}
        </div>
      ) : (
        <p>{t(k === "who" ? "ab_lead" : "ob_how_t")}</p>
      )}
    </div>
  );
}

/** One step of the welcome. A member: welcome, clubs, good to know, calendar (4). A guest: welcome, three slides, clubs near (5). */
function ObStep({
  ob,
  set,
  finish,
  h2,
}: {
  ob: Ob;
  set: (o: Partial<Ob>) => void;
  finish: (s: Settings) => void;
  h2: RefObject<HTMLHeadingElement | null>;
}) {
  const { s, member, step, guess } = ob;
  const D = useData();
  const toggleAlso = (id: string) => set({ s: withAlsoToggled(s, id) });
  const title = (text: string) => (
    <h2 id="obTitle" tabIndex={-1} ref={h2}>
      {text}
    </h2>
  );
  if (step < 0) return <InstallStep title={title} onWeb={() => set({ step: 0 })} />;
  if (step === 0) {
    const yes = async () => {
      const g = await guessClubs(D.data.clubs);
      // a member without clubs yet starts from the guess: the nearest as the main club
      const next = s.home ? s : { home: g[0] ?? "", also: g.slice(1) };
      set({ member: true, guess: g, s: next, step: 1 });
    };
    const no = async () => {
      const g = await guessClubs(D.data.clubs);
      set({ member: false, guess: g, step: 1 });
    };
    return (
      <>
        {title(t("ob_welcome"))}
        <p>{t("ob_member_q")}</p>
        <div className="choice">
          <button className="btn big" type="button" onClick={() => void yes()}>
            {t("ob_member")}
          </button>
          <button className="btn big alt" type="button" onClick={() => void no()}>
            {t("ob_guest")}
          </button>
        </div>
      </>
    );
  }
  if (member && step === 1) {
    return (
      <>
        {title(t("ob_q"))}
        {s.home ? null : <p>{t("ob_pick")}</p>}
        <h3>{t("ob_main")}</h3>
        <ClubChips single selected={s.home} onPick={(id) => set({ s: withHome(s, id) })} />
        <h3>{t("ob_also")}</h3>
        <ClubChips selected={new Set(s.also)} onPick={toggleAlso} exclude={[s.home]} />
        <ObNav next={t("next")} skip={t("skip")} onNext={() => set({ step: 2 })} onSkip={() => finish(s)} />
      </>
    );
  }
  if (member && step === 2) {
    return (
      <>
        {title(t("app_know_h"))}
        <ul className="facts2 big">
          {tx("ob_facts").map((f, i) => (
            <li key={i}>
              <Icon name={FACT_IC[i] ?? "info"} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <ObNav next={t("next")} onNext={() => set({ step: 3 })} />
      </>
    );
  }
  if (member) return <SubStep ids={[s.home, ...s.also]} title={title} onDone={() => finish(s)} />;
  if (!member && step <= 3) {
    // Skip jumps to the clubs
    return (
      <>
        <Slide step={step} title={title(t(SLIDE_TITLE[SLIDES[step - 1]![0]]))} />
        <ObNav
          next={t("next")}
          skip={t("skip")}
          onNext={() => set({ step: step + 1 })}
          onSkip={() => set({ step: 4 })}
        />
      </>
    );
  }
  const near = guess.length
    ? guess
    : D.data.clubs
        .filter(isRac)
        .slice(0, 4)
        .map((c) => c.id);
  return (
    <>
      {title(t("ob_follow"))}
      <ClubChips selected={new Set(s.also)} onPick={toggleAlso} only={near} />
      <ObNav next={t("done")} onNext={() => finish(s)} />
      <div className="credit">{t("credit_short")}</div>
    </>
  );
}

/** The welcome dialog. It stays mounted, so its content stays while it closes; run > 0 (re)starts it. */
export function Onboarding({ run }: { run: number }) {
  const D = useData();
  const dlg = useRef<HTMLDialogElement>(null);
  const h2 = useRef<HTMLHeadingElement>(null);
  const [ob, setOb] = useState<Ob | null>(null);
  // installed from Samsung Internet: the welcome turns into an arrow over the whole page, to the app's icon in the address bar
  const pointing = useInstallState() === "installed" && samsung();
  // a new run starts the steps over from the settings as they are: set while rendering, no draw in between shows the old steps
  const [ran, setRan] = useState(0);
  if (run !== ran) {
    setRan(run);
    setOb({
      s: { home: D.settings.home, also: [...D.settings.also] },
      member: null,
      step: isInstalled() ? 0 : -1,
      guess: [],
    });
  }
  // every step (and every chip tap) puts the focus on the title, so a screen reader reads where it is; finished, it closes
  useModal(dlg, !!ob && !ob.done, { focus: h2, refocus: ob });
  const finish = (s: Settings) => {
    setSettings(s);
    store.set("rac.onboarded", true);
    setOb((o) => o && { ...o, done: true });
    const now = getData(); // the state setSettings() just set
    const mine = myClubs(now);
    if (mine.length) toast(t("ob_showing", { clubs: mine.map((id) => club(now, id).short).join(", ") }));
  };
  const set = (o: Partial<Ob>) => setOb((cur) => cur && { ...cur, ...o });
  return (
    <dialog
      className={cx("ob", ob?.member === false && "full", ob?.step === -1 && pointing && "point")}
      id="ob"
      aria-labelledby="obTitle"
      ref={dlg}
      onCancel={(ev) => {
        ev.preventDefault();
        if (ob) finish(ob.s);
      }}
    >
      <div className="ob-in">
        {ob && ob.step >= 0 ? <Bar n={ob.member === false ? 5 : 4} step={ob.step} /> : null}
        {ob ? <ObStep ob={ob} set={set} finish={finish} h2={h2} /> : null}
      </div>
    </dialog>
  );
}

/** the progress dots */
function Bar({ n, step }: { n: number; step: number }) {
  return (
    <div className="bar2" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i <= step ? "on" : ""} />
      ))}
    </div>
  );
}
