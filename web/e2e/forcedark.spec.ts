// A browser that darkens websites by force (Chrome's "darken websites", Samsung Internet's "dark sites"): the app answers with its
// own dark theme and keeps the forced darkening off. A file of its own: the browser is started with the darkening switched on.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

test.use({ launchOptions: { args: ["--blink-settings=forceDarkModeEnabled=true"] } });

/** the colour the browser really painted in the middle of the top bar (forced darkening happens at paint: styles don't show it) */
const painted = async (page: Page) => {
  const box = (await page.locator("header#top").boundingBox())!;
  const shot = await page.screenshot({
    clip: { x: box.x + box.width / 2, y: box.y + box.height - 8, width: 1, height: 1 },
  });
  return page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
    const g = new OffscreenCanvas(1, 1).getContext("2d")!;
    g.drawImage(img, 0, 0);
    return [...g.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, shot.toString("base64"));
};
test("gets the app's own dark theme, not darkened a second time; light chosen in Settings stays light", async ({
  page,
}) => {
  await page.goto("#/settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "only dark");
  expect(await painted(page)).toEqual([0x21, 0x1e, 0x28]); // --surface of the dark theme, as written
  await page.getByRole("button", { name: "Light" }).click();
  await page.reload();
  // the choice is kept and declared. Whether the browser then leaves it light can't be shown here: this switch darkens
  // every page, "only light" or not, where Chrome's own setting honours it
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "only light");
});
