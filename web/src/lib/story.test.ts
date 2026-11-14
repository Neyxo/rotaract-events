import { expect, it } from "vitest";
import { wrap } from "./story";

it("wrap: breaks at words, cuts after max lines", () => {
  const fits = (s: string) => s.length <= 10;
  expect(wrap("one two three four", fits, 5)).toEqual(["one two", "three four"]);
  expect(wrap("one two three four five six", fits, 2)).toEqual(["one two", "three four…"]);
  expect(wrap("", fits, 2)).toEqual([]);
});
