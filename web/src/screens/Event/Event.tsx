// The event screen: a frosted card on the lead club's colour wash, with a head that sticks and compacts as you
// scroll, the facts, the description, then up to three more events of the same clubs.
import { useState } from "react";
import type { ScreenProps } from "../../App";
import { t } from "../../i18n";
import { club, eventById } from "../../lib/data";
import { clubVars } from "../../lib/color";
import { dayN, fmt, isPast, metaLine, relDay, whenLong } from "../../lib/dates";
import { mapsUrl } from "../../lib/geo";
import { href } from "../../lib/route";
import { shareUrl } from "../../lib/share";
import { storyImage } from "../../lib/story";
import type { Club as ClubT, Event as Ev } from "../../lib/types";
import {
  ClubChip,
  DatePane,
  EventCard,
  Footer,
  HelpLinks,
  Icon,
  IcsLink,
  StarButton,
  Status,
  copy,
  Popup,
  share,
  shareStory,
  GoPlace,
  MorphHead,
  Sh,
  useData,
  useTitle,
  useWash,
} from "../../components";

/** the Polaris page of the event; international events live on their organisers' sites instead */
const onPolaris = (e: Ev) => e.url.includes("/agenda/show/");
/** still open for registration; otherwise the button only opens the event on Polaris */
const isOpen = (e: Ev) => !e.cancelled && !isPast(e);

function goLabel(e: Ev): string {
  // a Rotary event opens on its club's own Polaris site
  if (e.layer === "rotary") return t("open_rotary");
  if (isOpen(e)) return t("register");
  return onPolaris(e) ? t("open_polaris") : t("details");
}

/** Where to share the event: on a phone a story picture or LinkedIn; the system's share sheet (where there is one), or the copied link.
 *  The link is e/<id>.html: a small page with the event's link preview that forwards into the app. */
function SharePopup({ e, lead, onClose }: { e: Ev; lead: ClubT; onClose: () => void }) {
  const url = shareUrl({ event: e.id });
  const text = `${e.title} · ${fmt.full.format(new Date(e.start))}${e.location ? " · " + e.location : ""}`;
  const phone = window.matchMedia?.("(pointer: coarse)").matches;
  const then = (go: Promise<unknown>) => {
    void go;
    onClose();
  };
  return (
    <Popup title={t("share")} onClose={onClose}>
      <div className="choice sharepop">
        {/* phones (touch screens) only: a story is posted from the Instagram app; a desktop shares by the link */}
        {phone ? (
          <>
            <button
              className="btn big alt"
              type="button"
              onClick={() => then(shareStory(storyImage(e, lead, url), url))}
            >
              <Icon name="instagram" />
              Instagram Story
            </button>
            {/* LinkedIn reads the preview (title, picture) from the share page itself */}
            <a
              className="btn big alt"
              href={"https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url)}
              target="_blank"
              rel="noopener"
              onClick={onClose}
            >
              <Icon name="linkedin" />
              LinkedIn
            </a>
          </>
        ) : null}
        {"share" in navigator ? (
          <button className="btn big alt" type="button" onClick={() => then(share({ title: e.title, text, url }))}>
            <Icon name="share" />
            {t("share_send")}
          </button>
        ) : null}
        <button className="btn big alt" type="button" onClick={() => then(copy(url))}>
          <Icon name="ext" />
          {t("copy_link")}
        </button>
      </div>
    </Popup>
  );
}

function deadline(e: Ev): string {
  const n = dayN(e.deadline);
  return fmt.full.format(new Date(e.deadline)) + (n >= 0 ? " · " + relDay(n) : "");
}

function Hero({ src }: { src: string }) {
  return (
    <div className="hero">
      <img className="blur" src={src} alt="" aria-hidden="true" referrerPolicy="no-referrer" />
      <img src={src} alt="" referrerPolicy="no-referrer" />
    </div>
  );
}

function Head({ e }: { e: Ev }) {
  const D = useData();
  const lead = club(D, e.clubs[0] ?? "");
  const label = goLabel(e);
  return (
    <MorphHead className="head">
      {lead.logo ? <img className="wm" src={lead.logo} alt="" aria-hidden="true" /> : null}
      <DatePane e={e} />
      <div>
        <h1>{e.title}</h1>
        <div className="meta">{metaLine(e)}</div>
        <div className="tags">
          {e.clubs
            .filter((c) => D.clubs[c])
            .map((c) => (
              <ClubChip key={c} id={c} />
            ))}
          {e.cancelled ? <Status kind="bad" text={t("cancelled")} /> : null}
          {e.members ? <Status kind="" ic="lock" text={t("members_only")} /> : null}
        </div>
      </div>
      <StarButton e={e} />
      <a className="go" href={e.url} target="_blank" rel="noopener" title={label}>
        <Icon name="ext" />
        <span>{label}</span>
      </a>
    </MorphHead>
  );
}

function Facts({ e }: { e: Ev }) {
  const showDeadline = !!e.deadline && isOpen(e);
  return (
    <dl className="kv">
      <dt>{t("when")}</dt>
      <dd>{whenLong(e)}</dd>
      {e.location ? <dt>{t("where")}</dt> : null}
      {e.location ? (
        <dd>
          <a href={mapsUrl(e.location)} target="_blank" rel="noopener">
            <Icon name="pin" />
            {e.location}
          </a>
        </dd>
      ) : null}
      {showDeadline ? <dt>{t("deadline_h")}</dt> : null}
      {showDeadline ? <dd className={dayN(e.deadline) <= 2 ? "soon" : ""}>{deadline(e)}</dd> : null}
      {e.registration ? <dt>{t("registration")}</dt> : null}
      {e.registration ? <dd>{e.registration}</dd> : null}
    </dl>
  );
}

function Detail({ e }: { e: Ev }) {
  const D = useData();
  const polaris = onPolaris(e);
  const lead = club(D, e.clubs[0] ?? "");
  const [sharing, setSharing] = useState(false);
  const more = D.data.events
    .filter((x) => x.id !== e.id && !isPast(x) && x.clubs.some((c) => e.clubs.includes(c)))
    .slice(0, 3);
  return (
    <>
      <article className="evdetail glass">
        {e.image ? <Hero src={e.image} /> : null}
        <Head e={e} />
        <div className="links">
          <GoPlace />
          <button type="button" className="linkbtn" onClick={() => setSharing(true)}>
            <Icon name="share" />
            {t("share_event")}
          </button>
          {/* members-only: Polaris' calendar file needs a login; international events aren't on Polaris at all */}
          {e.members || !polaris ? null : (
            <IcsLink href={e.url.replace("/agenda/show/", "/agenda/ical/")} label={t("add_cal")}>
              <Icon name="download" />
            </IcsLink>
          )}
        </div>
        <Facts e={e} />
        {e.description || polaris ? <p className="desc">{e.description || t("no_desc")}</p> : null}
        {e.members ? <p className="desc">{t("members_note")}</p> : null}
        {e.layer === "rotary" ? <p className="desc">{t("rotary_note")}</p> : null}
      </article>
      {sharing && <SharePopup e={e} lead={lead} onClose={() => setSharing(false)} />}
      {polaris ? null : <HelpLinks keys={["intl"]} />}
      <Sh>{t("more_events")}</Sh>
      {more.map((x, i) => (
        <EventCard key={x.id} e={x} i={i} />
      ))}
      <Footer />
    </>
  );
}

export default function Event({ route }: ScreenProps) {
  const D = useData();
  // eventById: a shared link to a Rotary event opens even with the Rotary layer off
  const e = eventById(D, route.params.id ?? "");
  const lead = e ? club(D, e.clubs[0] ?? "") : null;
  useWash(lead?.color, e && lead ? club(D, e.clubs[1] || lead.id).color : null, lead?.color);
  useTitle(e?.title);
  if (!e || !lead) {
    return (
      <main className="wrap evpage">
        <div className="empty">
          {t("empty")}
          <br />
          <a className="linkbtn" href={href("home")}>
            {t("show_all")}
          </a>
        </div>
      </main>
    );
  }
  return (
    <main className="wrap evpage" style={clubVars(lead.color)}>
      <Detail e={e} />
    </main>
  );
}
