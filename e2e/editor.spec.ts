import { expect, test } from "@playwright/test";

import {
  addSlide,
  addText,
  collectPageErrors,
  createDeck,
  drawElement,
  editTextElement,
  elementCount,
  getCanvasBox,
  getViewUrl,
  insertEmoji,
  openDeck,
  selectElement,
  setNativeValue,
} from "./helpers";

test("edits text, shapes, styles, transforms, undo, and slides", async ({ page }) => {
  const errors = collectPageErrors(page);
  await createDeck(page);

  const title = page.getByTestId("deck-title");
  await title.fill("Quarterly plan");
  await title.press("Enter");
  await expect(title).toHaveValue("Quarterly plan");

  await addText(page, { x: 420, y: 260 }, "Hello world");
  await expect(page.locator('[data-testid="element-list"] button')).toHaveCount(1);
  await expect(
    page.locator('[data-testid="element-list"] button').first(),
  ).toHaveAttribute("data-element-text", "Hello world");

  await drawElement(page, "rect", { x: 240, y: 360 }, { x: 420, y: 490 });
  await drawElement(page, "ellipse", { x: 480, y: 360 }, { x: 620, y: 470 });
  await drawElement(page, "arrow", { x: 680, y: 520 }, { x: 880, y: 620 });
  await expect.poll(() => elementCount(page)).toBe(4);

  // Style the rectangle.
  await selectElement(page, 1);
  await expect(page.getByTestId("style-panel")).toContainText("Rectangle");
  await setNativeValue(page, "style-fill", "#ef4444");
  await expect(
    page.locator('[data-testid="element-list"] button').nth(1),
  ).toHaveAttribute("data-element-fill", "#ef4444");

  // Nudge and undo.
  const before = await page
    .locator('[data-testid="element-list"] button')
    .nth(1)
    .getAttribute("data-element-x");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () =>
      page.locator('[data-testid="element-list"] button').nth(1).getAttribute("data-element-x"),
    )
    .not.toBe(before);
  await page.keyboard.press("Control+z");
  await expect
    .poll(async () =>
      page.locator('[data-testid="element-list"] button').nth(1).getAttribute("data-element-x"),
    )
    .toBe(before);

  // Duplicate and delete.
  await page.getByTestId("duplicate-element").click();
  await expect.poll(() => elementCount(page)).toBe(5);
  await page.getByTestId("delete-element").click();
  await expect.poll(() => elementCount(page)).toBe(4);

  // Slides.
  await addSlide(page);
  await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(2);
  await expect(page.getByTestId("slide-1")).toHaveAttribute("data-current", "true");
  await page.getByRole("button", { name: "Duplicate slide" }).click();
  await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(3);
  await page.getByRole("button", { name: "Delete slide" }).click();
  await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Delete slide" }).click();
  await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Delete slide" })).toBeDisabled();

  expect(errors).toEqual([]);
});

test("moves, resizes, and rotates an element", async ({ page }) => {
  await createDeck(page);
  await drawElement(page, "rect", { x: 300, y: 320 }, { x: 500, y: 460 });
  await selectElement(page, 0);
  const element = page.locator('[data-testid="element-list"] button').first();
  const transform = await page.getByTestId("canvas-stage").evaluate((stage) => ({
    scale: Number((stage as HTMLElement).dataset.scale),
    contentX: Number((stage as HTMLElement).dataset.contentX),
    contentY: Number((stage as HTMLElement).dataset.contentY),
  }));
  const box = await getCanvasBox(page);

  const startX = Number(await element.getAttribute("data-element-x"));
  const startY = Number(await element.getAttribute("data-element-y"));
  const width = Number(await element.getAttribute("data-element-width"));
  const height = Number(await element.getAttribute("data-element-height"));
  const center = {
    x: box.x + transform.contentX + (startX + width / 2) * transform.scale,
    y: box.y + transform.contentY + (startY + height / 2) * transform.scale,
  };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 80, center.y + 40, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await element.getAttribute("data-element-x")))
    .toBeGreaterThan(startX + 100);

  const movedX = Number(await element.getAttribute("data-element-x"));
  const movedY = Number(await element.getAttribute("data-element-y"));
  const movedW = Number(await element.getAttribute("data-element-width"));
  const movedH = Number(await element.getAttribute("data-element-height"));
  const right = box.x + transform.contentX + (movedX + movedW) * transform.scale;
  const bottom = box.y + transform.contentY + (movedY + movedH) * transform.scale;
  await page.mouse.move(right, bottom);
  await page.mouse.down();
  await page.mouse.move(right + 50, bottom + 50, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await element.getAttribute("data-element-width")))
    .toBeGreaterThan(movedW + 40);
  await expect
    .poll(async () => Number(await element.getAttribute("data-element-height")))
    .toBeGreaterThan(movedH + 20);

  await setNativeValue(page, "style-rotation", "30");
  await expect(element).toHaveAttribute("data-element-rotation", "30");
  await expect(page.getByTestId("style-rotation")).toHaveValue("30");
});

test("presents slides and returns to the presented slide", async ({ page }) => {
  await createDeck(page);
  await addText(page, { x: 320, y: 260 }, "First slide");
  await addSlide(page);
  await addText(page, { x: 320, y: 260 }, "Second slide");
  await page.getByTestId("slide-0").click();

  await page.getByTestId("present-button").click();
  await expect(page.getByTestId("presentation")).toBeVisible();
  await expect(page.getByText("1 / 2")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("2 / 2")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("1 / 2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presentation")).toHaveCount(0);
  await expect(page.getByTestId("slide-0")).toHaveAttribute("data-current", "true");
});

test("reorders slides and keeps their content together", async ({ page }) => {
  await createDeck(page);
  await addText(page, { x: 320, y: 260 }, "Slide one text");
  await addSlide(page);
  await addText(page, { x: 320, y: 260 }, "Slide two text");
  await expect(page.locator('[data-testid="element-list"] button').first()).toHaveAttribute(
    "data-element-text",
    "Slide two text",
  );

  await page.getByTestId("slide-1").dragTo(page.getByTestId("slide-0"));
  await expect(page.getByTestId("slide-0")).toHaveAttribute("data-current", "true");
  await expect(page.locator('[data-testid="element-list"] button').first()).toHaveAttribute(
    "data-element-text",
    "Slide two text",
  );
});

test("draws, styles, and shares the extended shape library", async ({ page, browser }) => {
  const deck = await createDeck(page);
  await drawElement(page, "triangle", { x: 200, y: 260 }, { x: 360, y: 400 });
  await drawElement(page, "star", { x: 420, y: 260 }, { x: 600, y: 440 });
  await drawElement(page, "pentagon", { x: 660, y: 260 }, { x: 840, y: 420 });
  await drawElement(page, "line", { x: 300, y: 520 }, { x: 780, y: 640 });
  await expect.poll(() => elementCount(page)).toBe(4);

  const elements = page.locator('[data-testid="element-list"] button');
  await expect(elements.nth(0)).toHaveAttribute("data-element-type", "shape");
  await expect(elements.nth(0)).toHaveAttribute("data-element-shape", "triangle");
  await expect(elements.nth(1)).toHaveAttribute("data-element-shape", "star");
  await expect(elements.nth(2)).toHaveAttribute("data-element-shape", "pentagon");
  await expect(elements.nth(3)).toHaveAttribute("data-element-type", "line");

  await selectElement(page, 2);
  await expect(page.getByTestId("style-panel")).toContainText("Pentagon");
  await setNativeValue(page, "style-fill", "#ef4444");
  await setNativeValue(page, "style-stroke", "#0f172a");
  await setNativeValue(page, "style-stroke-width", "7");
  await expect(elements.nth(2)).toHaveAttribute("data-element-fill", "#ef4444");
  await expect(elements.nth(2)).toHaveAttribute("data-element-stroke", "#0f172a");

  await selectElement(page, 3);
  await expect(page.getByTestId("style-panel")).toContainText("Line");
  await expect(page.getByTestId("style-fill")).toHaveCount(0);
  await expect(page.getByTestId("style-stroke")).toHaveCount(1);
  await expect(page.getByTestId("style-stroke-width")).toHaveCount(1);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const other = await context.newPage();
  await openDeck(other, deck.url, "editor");
  const shared = other.locator('[data-testid="element-list"] button');
  await expect(shared).toHaveCount(4);
  await expect(shared.nth(2)).toHaveAttribute("data-element-shape", "pentagon");
  await expect(shared.nth(2)).toHaveAttribute("data-element-fill", "#ef4444");
  await context.close();

  await expect(page.locator('[data-testid="slide-0"] img')).toHaveCount(1);
});

test("uses L for the line tool and ignores tool shortcuts while typing", async ({ page }) => {
  await createDeck(page);
  await page.keyboard.press("v");
  await expect(page.getByTestId("tool-select")).toHaveAttribute("aria-pressed", "true");

  const title = page.getByTestId("deck-title");
  await title.click();
  await title.press("l");
  await expect(page.getByTestId("tool-select")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("tool-shapes")).toHaveAttribute("aria-pressed", "false");

  await page.getByTestId("canvas-stage").click({ position: { x: 10, y: 10 } });
  await page.keyboard.press("l");
  await expect(page.getByTestId("tool-shapes")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("tool-shapes")).toHaveAttribute(
    "aria-label",
    "Shapes: Line (L)",
  );
});

test("inserts, edits, and shares an emoji text element", async ({ page, browser }) => {
  const deck = await createDeck(page);
  await insertEmoji(page, "grin");
  await expect.poll(() => elementCount(page)).toBe(1);

  const element = page.locator('[data-testid="element-list"] button').first();
  await expect(element).toHaveAttribute("data-element-type", "text");
  await expect(element).toHaveAttribute("data-element-text", "😀");
  await expect(page.getByTestId("style-panel")).toContainText("Text");

  await editTextElement(page, 0, "😀🎉");
  await expect(element).toHaveAttribute("data-element-text", "😀🎉");

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const other = await context.newPage();
  await openDeck(other, deck.url, "editor");
  await expect(
    other.locator('[data-testid="element-list"] button').first(),
  ).toHaveAttribute("data-element-text", "😀🎉");
  await context.close();

  await openDeck(page, deck.url, "editor");
  await expect(
    page.locator('[data-testid="element-list"] button').first(),
  ).toHaveAttribute("data-element-text", "😀🎉");
});

test("viewers cannot draw shapes or insert emoji", async ({ page, browser }) => {
  await createDeck(page);
  const viewUrl = await getViewUrl(page);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const viewer = await context.newPage();
  await openDeck(viewer, viewUrl, "viewer");
  await expect(viewer.getByTestId("tool-shapes")).toHaveCount(0);
  await expect(viewer.getByTestId("tool-emoji")).toHaveCount(0);
  await context.close();
});
