import { expect, test } from "@playwright/test";

import {
  addSlide,
  createDeck,
  drawElement,
  elementCount,
  getViewUrl,
  getCanvasBox,
  insertEmoji,
  openDeck,
  pasteEnvelope,
  pasteImage,
  pastePlainText,
} from "./helpers";

test("copies and pastes elements within a slide, across slides, and across decks", async ({
  page,
}) => {
  const first = await createDeck(page);
  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  const source = page.locator('[data-testid="element-list"] button').first();
  const sourceX = Number(await source.getAttribute("data-element-x"));
  const sourceY = Number(await source.getAttribute("data-element-y"));

  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await expect.poll(() => elementCount(page)).toBe(2);
  const pasted = page.locator('[data-testid="element-list"] button').nth(1);
  expect(Number(await pasted.getAttribute("data-element-x"))).toBeCloseTo(sourceX + 24, 0);
  expect(Number(await pasted.getAttribute("data-element-y"))).toBeCloseTo(sourceY + 24, 0);

  await addSlide(page);
  await page.keyboard.press("Control+v");
  await expect.poll(() => elementCount(page)).toBe(1);

  // Cross-deck paste through the system clipboard.
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New deck" }).click();
  await page.waitForSelector('[data-testid="canvas-stage"]');
  const box = await getCanvasBox(page);
  await page.mouse.click(box.x + 500, box.y + 300);
  await page.keyboard.press("Control+v");
  await expect.poll(() => elementCount(page)).toBe(1);
  await expect(page.locator('[data-testid="element-list"] button').first()).toHaveAttribute(
    "data-element-type",
    "rect",
  );
  expect(first.deckId).not.toBe(page.url().split("/d/")[1]?.split("#")[0]);
});

test("pastes plain text and images", async ({ page }) => {
  await createDeck(page);
  await pastePlainText(page, "Pasted from outside\nSecond line");
  await expect.poll(() => elementCount(page)).toBe(1);
  const text = page.locator('[data-testid="element-list"] button').first();
  await expect(text).toHaveAttribute("data-element-type", "text");
  await expect(text).toHaveAttribute("data-element-text", "Pasted from outside\nSecond line");

  const upload = page.waitForResponse(
    (response) =>
      response.url().includes("/assets") && response.request().method() === "POST",
  );
  await pasteImage(page);
  expect((await upload).status()).toBe(201);
  await expect.poll(() => elementCount(page)).toBe(2);
  await expect(
    page.locator('[data-testid="element-list"] button').nth(1),
  ).toHaveAttribute("data-element-type", "image");

  // Whitespace-only text is ignored.
  await pastePlainText(page, "   ");
  await page.waitForTimeout(300);
  expect(await elementCount(page)).toBe(2);
});

test("rejects malformed clipboard data and honors read-only viewers", async ({ page, browser }) => {  const deck = await createDeck(page);
  await pasteEnvelope(page, [
    {
      id: "bad",
      type: "rect",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      fill: "#fff",
      stroke: "#000",
      strokeWidth: 1,
      cornerRadius: 0,
      unknown: true,
    },
  ]);
  await page.waitForTimeout(300);
  expect(await elementCount(page)).toBe(0);

  await pasteEnvelope(
    page,
    Array.from({ length: 201 }, (_, index) => ({
      id: `bad-${index}`,
      type: "rect",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      opacity: 1,
      fill: "#fff",
      stroke: "#000",
      strokeWidth: 1,
      cornerRadius: 0,
    })),
  );
  await page.waitForTimeout(300);
  expect(await elementCount(page)).toBe(0);

  const viewUrl = await getViewUrl(page);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const viewer = await context.newPage();
  await openDeck(viewer, viewUrl, "viewer");
  await pastePlainText(viewer, "Should not appear");
  await expect(viewer.getByText("This deck is read-only")).toBeVisible();
  expect(await elementCount(viewer)).toBe(0);
  await context.close();
  expect(deck.editToken).toBeTruthy();
});

test("copies and pastes shapes and emoji text without losing their identity", async ({
  page,
}) => {
  await createDeck(page);
  await drawElement(page, "hexagon", { x: 280, y: 300 }, { x: 480, y: 460 });
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await expect.poll(() => elementCount(page)).toBe(2);

  const first = page.locator('[data-testid="element-list"] button').first();
  const pasted = page.locator('[data-testid="element-list"] button').nth(1);
  const fill = await first.getAttribute("data-element-fill");
  await expect(first).toHaveAttribute("data-element-type", "shape");
  await expect(first).toHaveAttribute("data-element-shape", "hexagon");
  await expect(pasted).toHaveAttribute("data-element-type", "shape");
  await expect(pasted).toHaveAttribute("data-element-shape", "hexagon");
  await expect(pasted).toHaveAttribute("data-element-fill", fill ?? "");

  await insertEmoji(page, "party");
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await expect.poll(() => elementCount(page)).toBe(4);

  const emoji = page.locator('[data-testid="element-list"] button').nth(2);
  const pastedEmoji = page.locator('[data-testid="element-list"] button').nth(3);
  await expect(emoji).toHaveAttribute("data-element-type", "text");
  await expect(emoji).toHaveAttribute("data-element-text", "🥳");
  await expect(pastedEmoji).toHaveAttribute("data-element-text", "🥳");
});

test("shows client-side upload errors for oversized and unsupported images", async ({ page }) => {
  await createDeck(page);
  await page.getByTestId("image-input").setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(15 * 1024 * 1024),
  });
  await expect(page.getByText("Images must be 10 MB or smaller")).toBeVisible();
  await expect.poll(() => elementCount(page)).toBe(0);

  await page.getByTestId("image-input").setInputFiles({
    name: "vector.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
  });
  await expect(page.getByText("Use a PNG, JPEG, or WebP image")).toBeVisible();
  await expect.poll(() => elementCount(page)).toBe(0);
});
