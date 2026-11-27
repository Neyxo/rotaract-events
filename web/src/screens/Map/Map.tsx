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
import { club, isRac } from "../../lib/data";
import { fmt, isPast, whenShort } from "../../lib/dates";
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

/** the pin's style: the club colour, and its crest as the faded backdrop of the sheet */
const sheetVars = (c: Club) => pinVars(c.color || BRAND.cranberry) + (c.logo ? `;--crest:url(${c.logo})` : "");

/** an event: a calendar sheet with a point at the place */
function eventIcon(c: Club, e: Event): L.DivIcon {
  const html = `<span style="${sheetVars(c)}">${sheet(new Date(e.start))}</span>`;
  return L.divIcon({ className: "mapevent", iconSize: [36, 46], iconAnchor: [18, 46], popupAnchor: [0, -46], html });
}

/** events close together: a stack of sheets, the next one's date on top and how many in a badge */
function groupIcon(c: Club, es: Event[]): L.DivIcon {
  const html = `<span style="${sheetVars(c)}">${sheet(new Date(es[0]!.start))}<em>${es.length}</em></span>`;
  return L.divIcon({
    className: "mapevent mapgroup",
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -50],
    html,
  });
}

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
function clubIcon(c: Club): L.DivIcon {
  const clip = "crest-" + c.id;
  const html =
    `<span style="${pinVars(c.color || BRAND.cranberry)}"><svg viewBox="0 0 40 40" aria-hidden="true">` +
    `<clipPath id="${clip}"><circle cx="20" cy="20" r="13.5"/></clipPath>` +
    '<circle class="cogs" cx="20" cy="20" r="17.5" pathLength="48"/><circle class="ring" cx="20" cy="20" r="14.5"/>' +
    (c.logo
      ? `<image href="${c.logo}" x="4.5" y="4.5" width="31" height="31" preserveAspectRatio="xMidYMin slice" clip-path="url(#${clip})"/>`
      : "") +
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
type Open = { el: HTMLElement; popup: L.Popup; kind: "event" | "club"; ids: string[] };

/** an empty popup for the marker; when it opens, the screen renders the content into it (setOpen). While it is open its pin stands
 *  out, lifted and in front, and the other pins fade (#map.picking), so it is clear which pin the popup belongs to. */
function bindPop(
  m: L.Marker,
  kind: Open["kind"],
  ids: string[],
  setOpen: (f: (o: Open | null) => Open | null) => void,
): L.Marker {
  const el = document.createElement("div");
  const z = m.options.zIndexOffset ?? 0;
  const mark = (on: boolean) => {
    m.getElement()?.classList.toggle("on", on);
    m.setZIndexOffset(on ? 5000 : z);
    m.getElement()?.closest(".leaflet-container")?.classList.toggle("picking", on);
  };
  return m
    .bindPopup(el, POP)
    .on("popupopen", () => {
      mark(true);
      setOpen(() => ({ el, popup: m.getPopup()!, kind, ids }));
    })
    .on("popupclose", () => {
      mark(false);
      setOpen((o) => (o?.el === el ? null : o));
    });
}

/** an event in a map popup: the list's card, trimmed for the map: the time and the place on lines of their own, no club chip or
 *  picture (the pin says the club), the title in full */
function MapCard({ e }: { e: Event }) {
  const lead = club(useData(), e.clubs[0] ?? "");
  return (
    <article className="event mapcard" style={clubVars(lead.color)}>
      <a className="open" href={href("event", e.id)} aria-label={e.title} />
      {lead.logo ? <img className="wm" src={lead.logo} alt="" aria-hidden="true" /> : null}
      <DatePane e={e} />
      <div className="body">
        <h4>{e.title}</h4>
        <div className="meta">{whenShort(e)}</div>
        {e.location ? <div className="meta">{e.location}</div> : null}
        <div className="tags">
          {e.cancelled ? <Status kind="bad" text={t("cancelled")} /> : null}
          {e.members ? <Status kind="" ic="lock" text={t("members_only")} /> : null}
          {isPast(e) ? null : <DeadlineTag e={e} />}
        </div>
      </div>
      <div className="side">
        <StarButton e={e} />
      </div>
    </article>
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
        bindPop(L.marker(c.coords, { title: c.name, icon: clubIcon(c) }), "club", [c.id], setOpen).addTo(group);
  }, [clubs, D]);

  // events close together on screen become one stack; regrouped on every zoom (which also closes an open popup)
  useEffect(() => {
    const group = layer.current;
    const map = mapRef.current;
    if (!group || !map) return;
    group.clearLayers();
    const shown = D.data.events.filter((e) => e.coords && (past || !isPast(e)));
    for (const es of groupNear(shown, (e) => map.project(e.coords!, zoom))) {
      const e = es[0]!;
      const lead = club(D, e.clubs[0] ?? "");
      // events above the clubs: an event without its own place sits on its club's town
      const m =
        es.length === 1
          ? L.marker(e.coords!, { title: e.title, icon: eventIcon(lead, e), zIndexOffset: 1000 })
          : L.marker(e.coords!, { title: nEvents(es.length), icon: groupIcon(lead, es), zIndexOffset: 1000 });
      bindPop(
        m,
        "event",
        es.map((x) => x.id),
        setOpen,
      ).addTo(group);
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

/** what the open popup shows, rendered into it: a club, or one event or a stack of them as a scrolling list */
function popContent(o: Open, D: ReturnType<typeof useData>) {
  const c = o.kind === "club" && D.clubs[o.ids[0] ?? ""];
  const es = o.kind === "event" ? D.data.events.filter((x) => o.ids.includes(x.id)) : [];
  return createPortal(
    <>
      {c && <ClubPop c={c} />}
      {es.length > 0 && (
        <div className="maplist">
          {es.map((e) => (
            <MapCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </>,
    o.el,
  );
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
