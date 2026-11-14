// The story picture: drawn in a real browser (jsdom has no canvas) and, where files can't be shared, downloaded.
import { expect, GUEST, test } from "./fixtures";

test.use({ storage: GUEST });

test("on a phone Story gives a 1080x1920 PNG of the event and LinkedIn gets the share page; not offered on a desktop", async ({
  page,
}, info) => {
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
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Instagram Story" }).click();
  const file = info.outputPath("story.png");
  await (await download).saveAs(file);
  expect((await download).suggestedFilename()).toBe("219091.png");
  const size = await page.evaluate(
    async (b64) => {
      const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
      return [img.width, img.height];
    },
    (await import("node:fs")).readFileSync(file).toString("base64"),
  );
  expect(size).toEqual([1080, 1920]);
});
