// The map: every event with coordinates as a club-coloured dot on the swisstopo map, filling the screen between the bars.
// Under them the three Rotary districts as faint coloured areas, and each club's home as its crest in a cogged ring (can be hidden).
// Leaflet owns div#map; React renders the switches and the legend over it, tells Leaflet what to draw, and renders the open popup's
// content into it through a portal: the event card of the lists, or a small version of the club page's header.
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ScreenProps } from "../../App";
import { nEvents, t } from "../../i18n";
import { BRAND, clubVars, DISTRICT_IDS, DISTRICTS, isDistrict, onColor } from "../../lib/color";
import { club, isRac, myClubs, type AppData } from "../../lib/data";
import { deadlineState, fmt, isPast, whenShort } from "../../lib/dates";
import { SWISSTOPO_GREY } from "../../lib/geo";
import { href } from "../../lib/route";
import type { Club, Event } from "../../lib/types";
import { DatePane, DeadlineTag, EventCard, Icon, Popup, StarButton, Status, useData } from "../../components";
// the districts as whole cantons (plus Liechtenstein in 2000), merged and simplified from swisstopo's canton borders and OSM
import districts from "./districts.json";

/** Easter egg: the bunker's archive holds the past events, newest first; the popup shows the latest FILES of them */
export const archive = (events: Event[]): Event[] =>
  events.filter(isPast).sort((a, b) => +new Date(b.start) - +new Date(a.start));
const FILES = 30;

const pinVars = (color: string) => `--c:${color};--on-c:${onColor(color)}`;
/** a calendar sheet: the month on a band in the club colour, the day under it. Markup, because Leaflet's divIcon takes markup. */
const sheet = (d: Date) => `<b>${fmt.mon.format(d)}</b><i>${fmt.day.format(d)}</i>`;

/** the pin's style: the club colour, and its crest as the faded backdrop of the sheet. The crest's URL made absolute: a relative url()
 *  in a custom property resolves against the stylesheet that uses it, in the build assets/, where there are no crests. */
const sheetVars = (c: Club) =>
  pinVars(c.color || BRAND.cranberry) + (c.logo ? `;--crest:url(${new URL(c.logo, document.baseURI).href})` : "");

/** an event: a calendar sheet with a point at the place */
function eventIcon(c: Club, e: Event): L.DivIcon {
  const html = `<span style="${sheetVars(c)}">${sheet(new Date(e.start))}</span>`;
  return L.divIcon({ className: "mapevent", iconSize: [36, 46], iconAnchor: [18, 46], popupAnchor: [0, -46], html });
}

/** events close together: up to three blank sheets fanned out, each in its event's club colour, and how many in front. No date, so it
 *  is never read as one event; a tap zooms in until they come apart. */
function groupIcon(D: AppData, es: Event[]): L.DivIcon {
  const fan = es.length > 2 ? [-16, 0, 16] : [-10, 10];
  const sheets = fan
    .map((r, i) => `<s style="${pinVars(club(D, es[i]!.clubs[0] ?? "").color || BRAND.cranberry)};--r:${r}deg"></s>`)
    .join("");
  return L.divIcon({ className: "mapgroup", iconSize: [48, 44], html: `<span>${sheets}<em>${es.length}</em></span>` });
}

/** from this zoom on events are never stacked; events at the very same place (one without its own place sits on its club's town)
 *  are spread on a small circle instead */
const SPLIT = 14;
const SPREAD = 26;

/** greedy grouping by distance on screen: each item joins the first group whose first item is within r pixels.
 *  ponytail: O(n²), fine for a few hundred events; a grid index if it ever gets slow. */
export function groupNear<T>(items: T[], at: (x: T) => { x: number; y: number }, r = 40): T[][] {
  const groups: { p: { x: number; y: number }; items: T[] }[] = [];
  for (const it of items) {
    const p = at(it);
    const g = groups.find((g) => Math.hypot(g.p.x - p.x, g.p.y - p.y) < r);
    if (g) g.items.push(it);
    else groups.push({ p, items: [it] });
  }
  return groups.map((g) => g.items);
}

/** a club's home: its crest in a cogged ring in its colour, centred on the town, a little faded behind the events. The crest fills the
 *  disc: cut to the circle from its top (a shield's point at the bottom falls outside), on the club colour where the crest is narrower. */
/** crests with a white edge of their own, cut a little deeper on the map: the share trimmed off each side */
const TRIM: Record<string, number> = { stgallen: 0.09, "zurich-international": 0.06 };
function clubIcon(c: Club): L.DivIcon {
  const clip = "crest-" + c.id;
  const f = TRIM[c.id] ?? 0;
  const size = 31 / (1 - 2 * f);
  const at = `x="${(20 - size / 2).toFixed(2)}" y="${(4.5 - size * f).toFixed(2)}" width="${size.toFixed(2)}" height="${size.toFixed(2)}"`;
  const html =
    `<span style="${pinVars(c.color || BRAND.cranberry)}"><svg viewBox="0 0 40 40" aria-hidden="true">` +
    `<clipPath id="${clip}"><circle cx="20" cy="20" r="13.5"/></clipPath>` +
    '<circle class="cogs" cx="20" cy="20" r="17.5" pathLength="48"/><circle class="ring" cx="20" cy="20" r="14.5"/>' +
    (c.logo ? `<image href="${c.logo}" ${at} preserveAspectRatio="xMidYMin slice" clip-path="url(#${clip})"/>` : "") +
    "</svg></span>";
  return L.divIcon({ className: "mapclub", iconSize: [40, 40], popupAnchor: [0, -18], html });
}

// the padding keeps an opened popup clear of the switches on top and the legend at the bottom
const POP: L.PopupOptions = {
  minWidth: 280,
  maxWidth: 340,
  closeButton: false,
  className: "mappopup",
  autoPanPaddingTopLeft: [10, 100],
  autoPanPaddingBottomRight: [10, 20],
};
type Open = { el: HTMLElement; popup: L.Popup; kind: "event" | "club"; id: string };

/** an empty popup for the marker; when it opens, the screen renders the content into it (setOpen). While it is open its pin stands
 *  out, lifted and in front, and the other pins fade (#map.picking), so it is clear which pin the popup belongs to. */
function bindPop(
  m: L.Marker,
  kind: Open["kind"],
  id: string,
  map: L.Map,
  setOpen: (f: (o: Open | null) => Open | null) => void,
): L.Marker {
  const el = document.createElement("div");
  const z = m.options.zIndexOffset ?? 0;
  // on the map's own element: the marker's is already gone when a zoom redraws the pins and closes the popup that way
  const mark = (on: boolean) => {
    m.getElement()?.classList.toggle("on", on);
    m.setZIndexOffset(on ? 5000 : z);
    map.getContainer().classList.toggle("picking", on);
  };
  return m
    .bindPopup(el, POP)
    .on("popupopen", () => {
      mark(true);
      setOpen(() => ({ el, popup: m.getPopup()!, kind, id }));
    })
    .on("popupclose", () => {
      mark(false);
      setOpen((o) => (o?.el === el ? null : o));
    });
}

/** an event in a map popup: its picture on top, then the list's card trimmed for the map: no club chip (the pin says the club), no
 *  place (the pin is the place), the title in full. Of the statuses only what matters right now: a deadline in its last two days,
 *  members only when it is not one of your clubs. */
function MapCard({ e }: { e: Event }) {
  const D = useData();
  const lead = club(D, e.clubs[0] ?? "");
  const mine = myClubs(D);
  const notMine = !e.clubs.some((c) => mine.includes(c));
  return (
    <div className="mapcardwrap">
      {e.image ? <img className="mappic" src={e.pic ?? e.image} alt="" referrerPolicy="no-referrer" /> : null}
      <article className="event mapcard" style={clubVars(lead.color)}>
        <a className="open" href={href("event", e.id)} aria-label={e.title} />
        {lead.logo ? <img className="wm" src={lead.logo} alt="" aria-hidden="true" /> : null}
        <DatePane e={e} />
        <div className="body">
          <h4>{e.title}</h4>
          <div className="meta">{whenShort(e)}</div>
          <div className="tags">
            {e.cancelled ? <Status kind="bad" text={t("cancelled")} /> : null}
            {e.members && notMine ? <Status kind="" ic="lock" text={t("members_only")} /> : null}
            {deadlineState(e)?.soon ? <DeadlineTag e={e} /> : null}
          </div>
        </div>
        <div className="side">
          <StarButton e={e} />
        </div>
      </article>
    </div>
  );
}

/** a club in a popup: the club page's header in small, its colour block with the crest faded large behind the name */
function ClubPop({ c }: { c: Club }) {
  const D = useData();
  const n = D.data.events.filter((e) => e.clubs.includes(c.id) && !isPast(e)).length;
  const sub = [isDistrict(c.district) ? t(DISTRICTS[c.district].key) : t("national"), c.city]
    .filter(Boolean)
    .join(" · ");
  return (
    <a className="clubpop" href={href("club", c.id)} style={clubVars(c.color)}>
      {c.logo ? <img className="big" src={c.logo} alt="" /> : null}
      {c.logo ? <img className="c" src={c.logo} alt="" /> : null}
      <span className="txt">
        <b>{c.name}</b>
        <small>{sub}</small>
        <small>{nEvents(n)}</small>
      </span>
      <Icon name="back" className="chev" />
    </a>
  );
}

/** a checkbox on the map, kept in the history entry, so back/forward brings it back as a browser restores a form field */
function useKept(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(
    () => ((history.state as Record<string, unknown> | null)?.[key] as boolean | undefined) ?? initial,
  );
  return [
    v,
    (x) => {
      setV(x);
      history.replaceState({ ...(history.state as object | null), [key]: x }, "");
    },
  ];
}

export default function MapScreen({ route }: ScreenProps) {
  const D = useData();
  const [past, setPast] = useKept("past", false);
  const [clubs, setClubs] = useKept("clubs", true);
  const [count, setCount] = useState<number | null>(null);
  // #/map?bunker (the developer screen's link) starts at the bunker with its archive open
  const [bunker, setBunker] = useState(() => route.query.has("bunker"));
  const box = useRef<HTMLDivElement>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clubLayer = useRef<L.LayerGroup | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  // the popup measured itself while still empty: once its content is in, it sizes and pans again
  useLayoutEffect(() => {
    open?.popup.update();
  }, [open]);
  const startsAtBunker = useEffectEvent(() => bunker);
  const [zoom, setZoom] = useState(8);

  useEffect(() => {
    // Switzerland & Liechtenstein, no zooming out to space
    const map = L.map(box.current!, {
      minZoom: 7,
      maxBounds: [
        [45, 4.5],
        [48.6, 12],
      ],
      maxBoundsViscosity: 1,
    }).setView([46.9, 8.2], 8);
    mapRef.current = map;
    // the grey national map, so the markers carry the colour
    L.tileLayer(SWISSTOPO_GREY, { maxZoom: 18, attribution: "© swisstopo" }).addTo(map);
    L.geoJSON(districts as GeoJSON.FeatureCollection, {
      interactive: false,
      style: (f) => {
        const d = String(f?.properties?.district);
        const color = isDistrict(d) ? DISTRICTS[d].color : BRAND.cranberry;
        return { color, weight: 2, opacity: 0.7, fillColor: color, fillOpacity: 0.12 };
      },
    }).addTo(map);
    clubLayer.current = L.layerGroup().addTo(map);
    layer.current = L.layerGroup().addTo(map);
    // Easter egg: the Röstigraben, a faint dashed line once you zoom in. Roughly the language border from Biel/Bienne to Sierre/Siders.
    // Two lines: the one you see, and an invisible wide one under it so a finger can hit it.
    const pts: L.LatLngTuple[] = [
      [47.14, 7.25],
      [47.05, 7.09],
      [46.93, 7.12],
      [46.81, 7.16],
      [46.7, 7.14],
      [46.61, 7.24],
      [46.48, 7.2],
      [46.36, 7.22],
      [46.29, 7.53],
    ];
    const graben = L.featureGroup([
      L.polyline(pts, { weight: 24, opacity: 0 }),
      L.polyline(pts, { color: BRAND.cranberry, weight: 3, opacity: 0.45, dashArray: "2 9", interactive: false }),
    ]).bindPopup("Röstigraben 🥔");
    // Easter egg: a small bunker door in the Gotthard, where the fortress museum Sasso San Gottardo is. It opens the classified archive (below).
    const door = L.marker([46.556, 8.565], {
      title: t("bunker"),
      icon: L.divIcon({
        className: "mapbunker",
        iconSize: [38, 38],
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21 9 6l4 6 2-3 8 12z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/></svg>',
      }),
    }).on("click", () => setBunker(true));
    const eggs = L.layerGroup([graben, door]);
    map.on("zoomend", () => {
      setZoom(map.getZoom());
      if (map.getZoom() >= 10) eggs.addTo(map);
      else eggs.remove();
    });
    if (startsAtBunker()) map.setView(door.getLatLng(), 11, { animate: false });
    return () => {
      map.remove();
      layer.current = null;
      clubLayer.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = clubLayer.current;
    if (!group) return;
    group.clearLayers();
    if (!clubs) return;
    for (const c of D.data.clubs)
      if (c.coords && isRac(c))
        bindPop(L.marker(c.coords, { title: c.name, icon: clubIcon(c) }), "club", c.id, mapRef.current!, setOpen).addTo(
          group,
        );
  }, [clubs, D]);

  // events close together on screen become one stack; regrouped on every zoom (which also closes an open popup)
  useEffect(() => {
    const group = layer.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();
    const shown = D.data.events.filter((e) => e.coords && (past || !isPast(e)));
    const groups = zoom >= SPLIT ? shown.map((e) => [e]) : groupNear(shown, (e) => map.project(e.coords!, zoom));
    // how many events share each exact place, and which of them comes next: those are spread on a circle
    const same = Map.groupBy(shown, (e) => String(e.coords));
    for (const es of groups) {
      const e = es[0]!;
      if (es.length > 1) {
        L.marker(e.coords!, { title: nEvents(es.length), icon: groupIcon(D, es), zIndexOffset: 1000 })
          .on("click", () => zoomApart(map, es))
          .addTo(group);
        continue;
      }
      const at = same.get(String(e.coords))!;
      let pos = L.latLng(e.coords!);
      if (at.length > 1) {
        const a = (2 * Math.PI * at.indexOf(e)) / at.length;
        pos = map.unproject(map.project(pos, zoom).add([SPREAD * Math.sin(a), -SPREAD * Math.cos(a)]), zoom);
      }
      // events above the clubs: an event without its own place sits on its club's town
      const m = L.marker(pos, { title: e.title, icon: eventIcon(club(D, e.clubs[0] ?? ""), e), zIndexOffset: 1000 });
      bindPop(m, "event", e.id, map, setOpen).addTo(group);
    }
    setCount(shown.length);
  }, [past, D, zoom]);

  return (
    <main className="mapwrap">
      <div id="map" ref={box} />
      <div className="mapopts">
        <label className="icon-btn mapopt">
          <input type="checkbox" checked={past} onChange={(ev) => setPast(ev.target.checked)} />{" "}
          <span>{t("v_past")}</span>
          {" · "}
          <span>{count === null ? "" : nEvents(count)}</span>
        </label>
        <label className="icon-btn mapopt">
          <input type="checkbox" checked={clubs} onChange={(ev) => setClubs(ev.target.checked)} />{" "}
          <span>{t("clubs")}</span>
        </label>
      </div>
      <details className="maplegend" open={innerWidth >= 700}>
        <summary>{t("map_legend")}</summary>
        <ul>
          <li>
            <i className="mapclub-mini" aria-hidden="true" />
            {t("clubs")}
          </li>
          <li>
            <i className="mapevent-mini" aria-hidden="true" />
            {t("events")}
          </li>
          {DISTRICT_IDS.map((d) => (
            <li key={d} style={{ "--c": DISTRICTS[d].color } as CSSProperties}>
              <i className="mapdistrict-mini" aria-hidden="true" />
              {t(DISTRICTS[d].key)}
            </li>
          ))}
        </ul>
      </details>
      {open && popContent(open, D)}
      {bunker && <Bunker events={archive(D.data.events)} onClose={() => setBunker(false)} />}
    </main>
  );
}

/** what the open popup shows, rendered into it: a club or an event */
function popContent(o: Open, D: AppData) {
  const c = o.kind === "club" && D.clubs[o.id];
  const e = o.kind === "event" && D.data.events.find((x) => x.id === o.id);
  return createPortal(
    <>
      {c && <ClubPop c={c} />}
      {e && <MapCard e={e} />}
    </>,
    o.el,
  );
}

/** a stack tapped: zoom in until its events come apart (at the latest at SPLIT), as far as they still fit on the screen */
function zoomApart(map: L.Map, es: Event[]): void {
  const now = map.getZoom();
  let z = now + 1;
  while (z < SPLIT && groupNear(es, (e) => map.project(e.coords!, z)).length < es.length) z++;
  const bounds = L.latLngBounds(es.map((e) => e.coords!));
  map.flyTo(bounds.getCenter(), Math.max(now + 1, Math.min(z, map.getBoundsZoom(bounds, false, L.point(80, 80)))), {
    duration: 0.45,
  });
}

/** the classified archive: the past events as the usual event cards, in the bunker's skin (app.css .bunker: typewriter type, army green,
 *  a file number and a stamp on each). The stamps are decoration. */
function Bunker({ events, onClose }: { events: Event[]; onClose: () => void }) {
  return (
    <Popup title={t("bunker_title")} onClose={onClose} className="ob full bunker">
      <p>
        <i className="stamp" aria-hidden="true">
          {t("bunker_stamp")}
        </i>
        {t("bunker_n", { n: events.length })}
        {events.length > FILES ? " " + t("bunker_cap", { m: FILES }) : ""}
      </p>
      <div className="files" style={{ "--stamp": JSON.stringify(t("bunker_stamp")) } as CSSProperties}>
        {events.slice(0, FILES).map((e) => (
          <EventCard key={e.id} e={e} />
        ))}
      </div>
    </Popup>
  );
}
