import { expect, test } from "@playwright/test";
import sharp from "sharp";

import {
  addSlide,
  addText,
  createDeck,
  drawElement,
  getViewUrl,
  insertEmoji,
  openDeck,
  pasteEnvelope,
  pdfPageCount,
} from "./helpers";

test("exports the current slide as a 1920x1080 PNG and all slides as PDF", async ({ page }) => {
  await createDeck(page);
  await addText(page, { x: 360, y: 260 }, "Export me");
  await addSlide(page);
  await addText(page, { x: 360, y: 260 }, "Second slide");

  await page.getByTestId("export-menu").click();
  const pngDownload = page.waitForEvent("download");
  await page.getByTestId("export-png").click();
  const png = await pngDownload;
  expect(png.suggestedFilename()).toMatch(/slide-2\.png$/);
  const pngBuffer = await png.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  });
  const metadata = await sharp(pngBuffer).metadata();
  expect(metadata.width).toBe(1920);
  expect(metadata.height).toBe(1080);

  await page.getByTestId("export-menu").click();
  const pdfDownload = page.waitForEvent("download");
  await page.getByTestId("export-pdf").click();
  const progress = page.getByTestId("export-progress");
  const sawProgress = await progress
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const pdfBuffer = await pdf.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  });
  expect(await pdfPageCount(pdfBuffer)).toBe(2);
  expect(sawProgress).toBe(true);
});

async function darkPixels(
  buffer: Buffer,
  left: number,
  top: number,
  width: number,
  height: number,
): Promise<number> {
  const region = await sharp(buffer)
    .extract({
      left: Math.max(0, Math.round(left)),
      top: Math.max(0, Math.round(top)),
      width,
      height,
    })
    .raw()
    .toBuffer();
  let count = 0;
  for (let index = 0; index < region.length; index += 3) {
    if (region[index] + region[index + 1] + region[index + 2] < 300) count += 1;
  }
  return count;
}

test("exports shapes, lines, and emoji with the expected geometry", async ({ page }) => {
  await createDeck(page);
  await drawElement(page, "triangle", { x: 180, y: 180 }, { x: 460, y: 460 });
  await drawElement(page, "line", { x: 500, y: 300 }, { x: 800, y: 300 });
  await drawElement(page, "arrow", { x: 500, y: 500 }, { x: 800, y: 500 });
  await insertEmoji(page, "smile");
  await expect.poll(() => page.locator('[data-testid="element-list"] button').count()).toBe(4);

  const elements = page.locator('[data-testid="element-list"] button');
  const triangle = elements.nth(0);
  const line = elements.nth(1);
  const arrow = elements.nth(2);

  const triangleX = Number(await triangle.getAttribute("data-element-x"));
  const triangleY = Number(await triangle.getAttribute("data-element-y"));
  const triangleWidth = Number(await triangle.getAttribute("data-element-width"));
  const triangleHeight = Number(await triangle.getAttribute("data-element-height"));

  await page.getByTestId("export-menu").click();
  const download = page.waitForEvent("download");
  await page.getByTestId("export-png").click();
  const png = await download;
  const buffer = await png.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  });

  const metadata = await sharp(buffer).metadata();
  expect(metadata.width).toBe(1920);
  expect(metadata.height).toBe(1080);

  const pixel = await sharp(buffer)
    .extract({
      left: Math.round(triangleX + triangleWidth / 2),
      top: Math.round(triangleY + triangleHeight / 2),
      width: 1,
      height: 1,
    })
    .raw()
    .toBuffer();
  expect([pixel[0], pixel[1], pixel[2]]).toEqual([254, 226, 226]);

  const lineEndX = Number(await line.getAttribute("data-element-x")) +
    Number(await line.getAttribute("data-element-width"));
  const lineEndY = Number(await line.getAttribute("data-element-y")) +
    Number(await line.getAttribute("data-element-height")) / 2;
  const arrowEndX = Number(await arrow.getAttribute("data-element-x")) +
    Number(await arrow.getAttribute("data-element-width"));
  const arrowEndY = Number(await arrow.getAttribute("data-element-y")) +
    Number(await arrow.getAttribute("data-element-height")) / 2;

  const lineDark = await darkPixels(buffer, lineEndX - 30, lineEndY - 30, 60, 60);
  const arrowDark = await darkPixels(buffer, arrowEndX - 30, arrowEndY - 30, 60, 60);
  expect(lineDark).toBeGreaterThan(0);
  expect(arrowDark).toBeGreaterThan(lineDark + 40);

  await page.getByTestId("export-menu").click();
  const pdfDownload = page.waitForEvent("download");
  await page.getByTestId("export-pdf").click();
  const pdf = await pdfDownload;
  const pdfBuffer = await pdf.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  });
  expect(await pdfPageCount(pdfBuffer)).toBe(1);
});

test("exports the latest local edit immediately", async ({ page }) => {
  await createDeck(page);
  await pasteEnvelope(page, [
    {
      id: "full-red",
      type: "rect",
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      rotation: 0,
      opacity: 1,
      fill: "#ff0000",
      stroke: "#ff0000",
      strokeWidth: 0,
      cornerRadius: 0,
    },
  ]);
  await expect.poll(() => page.locator('[data-testid="element-list"] button').count()).toBe(1);

  await page.getByTestId("export-menu").click();
  const download = page.waitForEvent("download");
  await page.getByTestId("export-png").click();
  const png = await download;
  const buffer = await png.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  });
  const pixel = await sharp(buffer)
    .extract({ left: 960, top: 540, width: 1, height: 1 })
    .raw()
    .toBuffer();
  expect([pixel[0], pixel[1], pixel[2]]).toEqual([255, 0, 0]);
});

test("viewers can export the current deck", async ({ page, browser }) => {
  await createDeck(page);
  await addText(page, { x: 360, y: 260 }, "Viewer export");
  const viewUrl = await getViewUrl(page);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const viewer = await context.newPage();
  await openDeck(viewer, viewUrl, "viewer");

  await viewer.getByTestId("export-menu").click();
  const download = viewer.waitForEvent("download");
  await viewer.getByTestId("export-pdf").click();
  const pdf = await download;
  const buffer = await pdf.createReadStream().then(async (stream) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  });
  expect(await pdfPageCount(buffer)).toBe(1);
  await context.close();
});

test("a failed image render aborts the PDF without downloading a partial file", async ({ page }) => {
  await createDeck(page);
  await pasteEnvelope(page, [
    {
      id: "missing-image",
      type: "image",
      x: 120,
      y: 120,
      width: 400,
      height: 300,
      rotation: 0,
      opacity: 1,
      assetId: "missing-asset-123456",
    },
  ]);
  await expect.poll(() => page.locator('[data-testid="element-list"] button').count()).toBe(1);

  const download = page
    .waitForEvent("download", { timeout: 2500 })
    .then(() => true)
    .catch(() => false);
  await page.getByTestId("export-menu").click();
  await page.getByTestId("export-pdf").click();
  await expect(page.getByText(/Could not load image/)).toBeVisible();
  expect(await download).toBe(false);
});
