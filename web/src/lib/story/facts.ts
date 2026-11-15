// What a story picture says and shows, worked out without a canvas: the date and time as the app's own formatters write them, the
// club's place and word, and which picture or map goes with the event.
import { LOCALE, t } from "../../i18n";
import { fmt, lastDay, startOfDay } from "../dates";
import type { Club, Coords, Event } from "../types";

export interface Facts {
  /** over several days: the date is a range, the day pane shows "14–18" */
  multi: boolean;
  /** "14", "14–18" */
  big: string;
  /** "Nov", "Jan–Feb" */
  mon: string;
  /** "Thursday", "Wed–Sun" */
  wd: string;
  /** "Thursday 3 December", "14–18 April" */
  date: string;
  /** "19:00" (German: "19:00 Uhr"), "All day" */
  time: string;
}
const day = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" });
const days = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long" });
const dry = (s: string) => s.replaceAll(".", ""); // "nov." -> "nov": the pane sets it in capitals
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function facts(e: Event): Facts {
  const s = new Date(e.start);
  const last = lastDay(e);
  // a timed event that ends after midnight is still one evening
  const multi = startOfDay(s) < startOfDay(last) && (e.allday || new Date(e.end).getTime() - s.getTime() > 864e5);
  const months = multi && s.getMonth() !== last.getMonth();
  return {
    multi,
    big: multi ? `${s.getDate()}–${last.getDate()}` : String(s.getDate()),
    mon: dry(months ? `${fmt.mon.format(s)}–${fmt.mon.format(last)}` : fmt.mon.format(s)),
    wd: multi ? dry(`${fmt.wd.format(s)}–${fmt.wd.format(last)}`) : fmt.wdl.format(s),
    date: multi ? days.formatRange(s, last) : day.format(s),
    time: e.allday ? cap(t("all_day")) : t("at_time", { t: fmt.time.format(s) }),
  };
}

/** the club as the place it is from, for its chip: "Rotaract Club Bern" -> "Bern", "Rotaract Schweiz/Liechtenstein (national)" -> "Schweiz/Liechtenstein" */
export const clubPlace = (name: string): string =>
  name.replace(/^(Rotaract\s+Club|Rotaract|RAC)\s+/i, "").replace(/\s*\(.*\)$/, "");
/** what the rows behind the first design spell: the short name, or the place where the short name is an abbreviation (LI, ZH Intl, CH/LI) */
export function clubWord(c: Pick<Club, "name" | "short">): string {
  const short = c.short || "";
  return (short.length < 4 || /Intl|\//.test(short) ? clubPlace(c.name) : short).toUpperCase();
}

/** swisstopo has no map beyond Switzerland and Liechtenstein */
const inCH = ([lat, lon]: Coords) => lat > 45.8 && lat < 47.85 && lon > 5.9 && lon < 10.55;
export type Media =
  | { kind: "pic"; src: string }
  /** exact: the event's own place (gets the pin); otherwise the club's home town */
  | { kind: "map"; at: Coords; exact: boolean }
  | { kind: "none" };
/** The event's picture if the feed kept a copy (pic: same origin, so the canvas stays exportable; e.image never is), else a map of
 *  where it is, else nothing. */
export function storyMedia(e: Pick<Event, "pic" | "coords">, club: Pick<Club, "coords">): Media {
  if (e.pic) return { kind: "pic", src: e.pic };
  const at = e.coords || club.coords;
  return at && inCH(at) ? { kind: "map", at, exact: !!e.coords } : { kind: "none" };
}
