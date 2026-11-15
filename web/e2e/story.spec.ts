// The story pictures: drawn in a real browser (jsdom has no canvas) and, where files can't be shared, downloaded.
import { readFileSync } from "node:fs";
import { expect, GUEST, test } from "./fixtures";

test.use({ storage: GUEST });

/** a grey 8x8 JPEG: what every map tile is answered with, CORS header included (without it the canvas could not be exported) */
const TILE = Buffer.from(
  [
    "/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABh" +
      "Y3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
      "AAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAAB" +
      "UAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAA" +
      "AAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9Y" +
      "WVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAM" +
      "ZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0o" +
      "OjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2Nj" +
      "Y2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/" +
      "xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAH/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIR" +
      "AxEAPwCpAEf/2Q==",
  ].join(""),
  "base64",
);

test("on a phone Story offers ten pictures, each a 1080x1920 PNG of the event; LinkedIn gets the share page; not offered on a desktop", async ({
  page,
  problems,
}, info) => {
  await page.route(/wmts\.geo\.admin\.ch/, (r) =>
    r.fulfill({ body: TILE, contentType: "image/jpeg", headers: { "access-control-allow-origin": "*" } }),
  );
  await page.goto("#/event/219091");
  await page.getByRole("button", { name: "Share" }).click();
  if (info.project.name === "desktop") {
    // a desktop gets the share sheet (if any) and the link only
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Instagram Story" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "LinkedIn" })).toHaveCount(0);
    return;
  }
  await expect(page.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    /linkedin\.com\/sharing\/share-offsite\/\?url=.*e%2F219091\.html$/,
  );
  await page.evaluate(() => Reflect.deleteProperty(Navigator.prototype, "canShare")); // as on a desktop browser
  const tiles = page.locator(".storygrid button");
  // the club's word, the app card (this event has a place, so its banner is the map), a cog, a Rotary template
  for (const name of ["Club name in the background", "App card", "Clockwork", "Rotary emblem"]) {
    await page.getByRole("button", { name: "Instagram Story" }).click();
    await expect(tiles).toHaveCount(10);
    await expect(page.locator(".storytile.wait")).toHaveCount(0); // every thumbnail drawn
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const file = info.outputPath(name + ".png");
    await (await download).saveAs(file);
    expect((await download).suggestedFilename()).toBe("219091.png");
    const size = await page.evaluate(async (b64) => {
      const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
      return [img.width, img.height];
    }, readFileSync(file).toString("base64"));
    expect(size).toEqual([1080, 1920]);
    await expect(tiles).toHaveCount(0); // shared: the popup is closed
    await page.getByRole("button", { name: "Share" }).click();
  }
  // back from the pictures to the ways to share
  await page.getByRole("button", { name: "Instagram Story" }).click();
  await page.getByRole("button", { name: "‹ Back" }).click();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
  expect(problems.console).toEqual([]);
});

test("a Rotary event is offered the two Rotary templates only", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "the story is a phone's way to share");
  await page.goto("#/event/217170");
  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "Instagram Story" }).click();
  await expect(page.locator(".storygrid button")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Rotary emblem" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rotary wheel rising" })).toBeVisible();
});
