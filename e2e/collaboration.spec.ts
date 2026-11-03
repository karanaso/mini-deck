import { expect, test } from "@playwright/test";

import {
  addSlide,
  addText,
  createDeck,
  drawElement,
  elementCount,
  getCanvasBox,
  getViewUrl,
  insertEmoji,
  openDeck,
  selectElement,
  waitForDeckReady,
} from "./helpers";

test("editors sync, see presence and cursors, and undo only their own work", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  const secondContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageB = await secondContext.newPage();
  await openDeck(pageB, deck.url);

  await expect(page.locator('[data-testid="presence"] button')).toHaveCount(2);
  await expect(pageB.locator('[data-testid="presence"] button')).toHaveCount(2);

  await page.getByTestId("deck-title").fill("Shared deck");
  await page.getByTestId("deck-title").press("Enter");
  await expect(pageB.getByTestId("deck-title")).toHaveValue("Shared deck");

  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  await expect.poll(() => elementCount(pageB)).toBe(1);
  await addText(pageB, { x: 650, y: 220 }, "From B");
  await expect.poll(() => elementCount(page)).toBe(2);

  // A's pointer produces a remote cursor in B.
  const canvasBox = await getCanvasBox(page);
  await page.mouse.move(canvasBox.x + 520, canvasBox.y + 260);
  const remoteCursor = pageB.locator('span[data-testid^="remote-"]').first();
  await expect.poll(async () => remoteCursor.getAttribute("data-cursor-x")).not.toBe("");

  // A's selection is visible in B's remote state.
  await selectElement(page, 0);
  const rectId = (
    await page.locator('[data-testid="element-list"] button').first().getAttribute("data-testid")
  )?.replace("element-", "");
  await expect(remoteCursor).toHaveAttribute("data-selection-ids", rectId ?? "");

  // Undo removes A's rectangle, not B's text.
  await page.keyboard.press("Control+z");
  await expect.poll(() => elementCount(page)).toBe(1);
  await expect
    .poll(async () =>
      page.locator('[data-testid="element-list"] button').first().getAttribute("data-element-type"),
    )
    .toBe("text");
  await expect.poll(() => elementCount(pageB)).toBe(1);

  // Offline editing is preserved and merged on reconnect.
  await page.context().setOffline(true);
  await expect(page.getByTestId("connection-badge")).toContainText("Offline");
  await drawElement(page, "ellipse", { x: 280, y: 540 }, { x: 430, y: 640 });
  await expect.poll(() => elementCount(page)).toBe(2);
  await expect.poll(() => elementCount(pageB)).toBe(1);
  await page.context().setOffline(false);
  await expect(page.getByTestId("connection-badge")).toContainText("Live", {
    timeout: 15_000,
  });
  await expect.poll(() => elementCount(pageB)).toBe(2);

  await secondContext.close();
});

test("viewers receive edits but cannot edit, share, or reveal the edit link", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  const viewUrl = await getViewUrl(page);

  const viewerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const viewer = await viewerContext.newPage();
  await openDeck(viewer, viewUrl, "viewer");

  await expect(viewer.getByTestId("share-button")).toHaveCount(0);
  await expect(viewer.getByTestId("tool-select")).toHaveCount(0);
  await expect(viewer.getByTestId("style-panel")).toHaveCount(0);
  await expect(viewer.getByTestId("deck-title")).toHaveJSProperty("tagName", "H1");
  await expect(viewer.getByTestId("present-button")).toBeVisible();
  await expect(viewer.getByTestId("export-menu")).toBeVisible();

  await drawElement(page, "ellipse", { x: 520, y: 340 }, { x: 680, y: 460 });
  await expect.poll(() => elementCount(viewer)).toBe(2);

  await selectElement(viewer, 0);
  await viewer.keyboard.press("Delete");
  await expect(viewer.getByText("This deck is read-only")).toBeVisible();
  await expect.poll(() => elementCount(viewer)).toBe(2);

  await viewer.getByTestId("present-button").click();
  await expect(viewer.getByTestId("presentation")).toBeVisible();
  await expect(viewer.getByText("1 / 1")).toBeVisible();
  await viewer.keyboard.press("Escape");
  await expect(viewer.getByTestId("presentation")).toHaveCount(0);

  const html = await viewer.content();
  expect(html).not.toContain(deck.editToken);
  expect(await viewer.evaluate(() => localStorage.getItem("mini-deck:recent-decks"))).toBeNull();

  await viewerContext.close();
  await expect(page.locator('[data-testid="presence"] button')).toHaveCount(1, {
    timeout: 10_000,
  });
});

test("late joiners receive the current deck state", async ({ page, browser }) => {
  const deck = await createDeck(page);
  await addText(page, { x: 360, y: 260 }, "Added before joining");
  await addText(page, { x: 360, y: 420 }, "Second element");

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const late = await context.newPage();
  await openDeck(late, deck.url);
  await expect.poll(() => elementCount(late)).toBe(2);
  await expect(
    late.locator('[data-testid="element-list"] button').first(),
  ).toHaveAttribute("data-element-text", "Added before joining");
  await context.close();
});

test("title changes appear in recent decks on the editing device", async ({ page }) => {
  await createDeck(page);
  await page.getByTestId("deck-title").fill("Renamed deck");
  await page.getByTestId("deck-title").press("Enter");
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("recent-deck")).toContainText("Renamed deck");
});

test("participant display name updates for collaborators", async ({ page, browser }) => {
  const deck = await createDeck(page);
  const otherContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const other = await otherContext.newPage();
  await waitForDeckReady(page);
  await openDeck(other, deck.url);
  await expect(other.locator('[data-testid="presence"] button')).toHaveCount(2);

  await page.getByRole("button", { name: /rename/ }).click();
  await page.getByTestId("participant-name").fill("Sam");
  await page.getByTestId("save-participant").click();
  await expect(page.getByRole("button", { name: /Sam \(you\)/ })).toBeVisible();
  await expect(other.locator('span[data-testid^="remote-"]').filter({ hasText: "Sam" })).toHaveCount(
    1,
  );
  await otherContext.close();
});

test("editors cannot delete another participant's work", async ({ page, browser }) => {
  await createDeck(page);
  const otherContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const other = await otherContext.newPage();
  await openDeck(other, page.url());

  await other.getByRole("button", { name: /rename/ }).click();
  await other.getByTestId("participant-name").fill("Bella");
  await other.getByTestId("save-participant").click();

  await drawElement(page, "rect", { x: 260, y: 300 }, { x: 430, y: 440 });
  await drawElement(other, "ellipse", { x: 600, y: 300 }, { x: 780, y: 440 });
  await expect.poll(() => elementCount(page)).toBe(2);

  const dialog = page.getByTestId("ownership-dialog");
  const message = page.getByTestId("ownership-message");

  await selectElement(page, 1);
  await page.keyboard.press("Delete");
  await expect(dialog).toBeVisible();
  await expect(message).toContainText("Bella");
  await expect.poll(() => elementCount(page)).toBe(2);
  await page.getByTestId("ownership-dismiss").click();
  await expect(dialog).toHaveCount(0);

  await selectElement(page, 1);
  await page.keyboard.press("Control+x");
  await expect(dialog).toBeVisible();
  await expect(message).toContainText("Bella");
  await expect.poll(() => elementCount(page)).toBe(2);
  await page.getByTestId("ownership-dismiss").click();

  await selectElement(page, 0);
  const target = page.locator('[data-testid="element-list"] button').nth(1);
  const box = await getCanvasBox(page);
  const stage = await page.getByTestId("canvas-stage").evaluate((element) => ({
    scale: Number((element as HTMLElement).dataset.scale),
    contentX: Number((element as HTMLElement).dataset.contentX),
    contentY: Number((element as HTMLElement).dataset.contentY),
  }));
  const targetX = Number(await target.getAttribute("data-element-x"));
  const targetY = Number(await target.getAttribute("data-element-y"));
  const targetWidth = Number(await target.getAttribute("data-element-width"));
  const targetHeight = Number(await target.getAttribute("data-element-height"));
  await page.keyboard.down("Shift");
  await page.mouse.click(
    box.x + stage.contentX + (targetX + targetWidth / 2) * stage.scale,
    box.y + stage.contentY + (targetY + targetHeight / 2) * stage.scale,
  );
  await page.keyboard.up("Shift");
  await page.keyboard.press("Delete");
  await expect(dialog).toBeVisible();
  await expect(message).toContainText("Bella");
  await expect.poll(() => elementCount(page)).toBe(2);
  await page.getByTestId("ownership-dismiss").click();
  await page.keyboard.press("Escape");

  await addSlide(other);
  await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(2);
  await page.getByTestId("slide-1").click();
  await page.getByRole("button", { name: "Delete slide" }).click();
  await expect(dialog).toBeVisible();
  await expect(message).toContainText("Bella");
  await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(2);
  await page.getByTestId("ownership-dismiss").click();
  await page.getByTestId("slide-0").click();

  await other.getByTestId("slide-0").click();
  await selectElement(other, 1);
  await other.keyboard.press("Delete");
  await expect.poll(() => elementCount(page)).toBe(1);

  await selectElement(page, 0);
  await page.keyboard.press("Delete");
  await expect.poll(() => elementCount(page)).toBe(0);

  await otherContext.close();
});

test("a participant viewing a deleted slide moves to an adjacent slide", async ({
  page,
  browser,
}) => {
  await createDeck(page);
  await addSlide(page);
  await expect(page.getByTestId("slide-1")).toHaveAttribute("data-current", "true");

  const otherContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const other = await otherContext.newPage();
  await openDeck(other, page.url());
  await other.getByTestId("slide-1").click();
  await expect(other.getByTestId("slide-1")).toHaveAttribute("data-current", "true");

  await page.getByRole("button", { name: "Delete slide" }).click();
  await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(1);
  await expect(other.locator('[data-testid^="slide-"]')).toHaveCount(1);
  await expect(other.getByTestId("slide-0")).toHaveAttribute("data-current", "true");
  await otherContext.close();
});

test("shapes and emoji sync between editors", async ({ page, browser }) => {
  const deck = await createDeck(page);
  const otherContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const other = await otherContext.newPage();
  await openDeck(other, deck.url);

  await drawElement(page, "star", { x: 240, y: 260 }, { x: 440, y: 460 });
  await expect.poll(() => elementCount(other)).toBe(1);
  await expect(
    other.locator('[data-testid="element-list"] button').first(),
  ).toHaveAttribute("data-element-shape", "star");

  await insertEmoji(other, "fire");
  await expect.poll(() => elementCount(page)).toBe(2);
  await expect(
    page.locator('[data-testid="element-list"] button').nth(1),
  ).toHaveAttribute("data-element-text", "🔥");

  await selectElement(other, 0);
  const before = await page
    .locator('[data-testid="element-list"] button')
    .first()
    .getAttribute("data-element-x");
  await other.keyboard.press("ArrowRight");
  await expect
    .poll(async () =>
      page
        .locator('[data-testid="element-list"] button')
        .first()
        .getAttribute("data-element-x"),
    )
    .not.toBe(before);

  await otherContext.close();
});
