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
