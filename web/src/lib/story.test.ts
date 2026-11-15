import { expect, it } from "vitest";
import { clubPlace, clubWord, storyMedia, storyVariants, wrap } from "./story";

it("wrap: breaks at words, cuts after max lines, keeps a dash with the word after it", () => {
  const fits = (s: string) => s.length <= 10;
  expect(wrap("one two three four", fits, 5)).toEqual(["one two", "three four"]);
  expect(wrap("one two three four five six", fits, 2)).toEqual(["one two", "three four…"]);
  expect(wrap("", fits, 2)).toEqual([]);
  expect(wrap("Stamm - Bowling", (s) => s.length <= 7, 3)).toEqual(["Stamm", "- Bowling"]);
});

it("storyVariants: a Rotaract event gets all ten, the Rotary templates last; a Rotary event only those two", () => {
  expect(storyVariants({}).map((v) => v.id)).toEqual([
    "club",
    "card",
    "swiss",
    "band",
    "cranberry",
    "cog",
    "dome",
    "clockwork",
    "rotary-emblem",
    "rotary-rising",
  ]);
  expect(storyVariants({ layer: "rotary" }).map((v) => v.id)).toEqual(["rotary-emblem", "rotary-rising"]);
});

it("clubPlace: the club's name without Rotaract in front and without a bracket at the end", () => {
  expect(clubPlace("Rotaract Luzern")).toBe("Luzern");
  expect(clubPlace("Rotaract Club Bern")).toBe("Bern");
  expect(clubPlace("RAC St. Gallen")).toBe("St. Gallen");
  expect(clubPlace("Rotaract Schweiz/Liechtenstein (national)")).toBe("Schweiz/Liechtenstein");
  expect(clubPlace("Rotaract Genève International")).toBe("Genève International");
});

it("clubWord: the short name in capitals, the place where the short name is an abbreviation", () => {
  expect(clubWord({ name: "Rotaract Luzern", short: "Luzern" })).toBe("LUZERN");
  expect(clubWord({ name: "Rotaract St. Gallen", short: "St. Gallen" })).toBe("ST. GALLEN");
  expect(clubWord({ name: "Rotaract Liechtenstein", short: "LI" })).toBe("LIECHTENSTEIN");
  expect(clubWord({ name: "Rotaract Zurich International", short: "ZH Intl" })).toBe("ZURICH INTERNATIONAL");
  expect(clubWord({ name: "Rotaract Schweiz/Liechtenstein (national)", short: "CH/LI" })).toBe("SCHWEIZ/LIECHTENSTEIN");
});

it("storyMedia: the copied picture, else a map of the event's place, else of the club's town, else nothing", () => {
  const zurich: [number, number] = [47.37, 8.54];
  const bern: [number, number] = [46.95, 7.45];
  expect(storyMedia({ pic: "pic/1.jpg", coords: zurich }, { coords: bern })).toEqual({ kind: "pic", src: "pic/1.jpg" });
  expect(storyMedia({ coords: zurich }, { coords: bern })).toEqual({ kind: "map", at: zurich, exact: true });
  expect(storyMedia({ coords: null }, { coords: bern })).toEqual({ kind: "map", at: bern, exact: false });
  expect(storyMedia({ coords: null }, { coords: null })).toEqual({ kind: "none" });
  // swisstopo has no map of Naples
  expect(storyMedia({ coords: [40.85, 14.27] }, { coords: null })).toEqual({ kind: "none" });
});
