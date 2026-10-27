import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  addText,
  createDeck,
  drawElement,
  getViewUrl,
  openDeck,
  setStoredLocale,
  waitForDeckReady,
} from "./helpers";

async function expectNoSeriousViolations(page: Page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(
    serious,
    `${context}: ${serious.map((violation) => `${violation.id} ${violation.help}`).join("; ")}`,
  ).toEqual([]);
}

test("landing and editor pass automated accessibility checks", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expectNoSeriousViolations(page, "landing");

  await createDeck(page);
  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  await addText(page, { x: 520, y: 260 }, "Accessible deck");
  await expectNoSeriousViolations(page, "editor");
});

test("viewer and presentation pass automated accessibility checks", async ({ page, browser }) => {
  const deck = await createDeck(page);
  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  const viewUrl = await getViewUrl(page);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const viewer = await context.newPage();
  await openDeck(viewer, viewUrl, "viewer");
  await expectNoSeriousViolations(viewer, "viewer");

  await viewer.getByTestId("present-button").click();
  await expect(viewer.getByTestId("presentation")).toBeVisible();
  await expectNoSeriousViolations(viewer, "presentation");
  await viewer.keyboard.press("Escape");
  await context.close();
  expect(deck.deckId).toBeTruthy();
});

test("dialogs manage focus and the viewer remains usable on a narrow screen", async ({
  page,
  browser,
}) => {
  await createDeck(page);
  await page.getByTestId("share-button").click();
  const dialog = page.getByTestId("share-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("view-link-url")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("share-button")).toBeFocused();

  const viewUrl = await getViewUrl(page);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const viewer = await context.newPage();
  await openDeck(viewer, viewUrl, "viewer");
  await expect(viewer.getByTestId("canvas-stage")).toBeVisible();
  await expect(viewer.getByTestId("present-button")).toBeVisible();
  const overflow = await viewer.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await context.close();
});

test("Greek landing, editor, viewer, and presentation pass automated accessibility checks", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  await setStoredLocale(page.context(), "el");

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  await expect(page.getByTestId("language-switcher")).toHaveAccessibleName("Γλώσσα");
  await expectNoSeriousViolations(page, "Greek landing");

  await page.goto(deck.url, { waitUntil: "networkidle" });
  await waitForDeckReady(page, "editor", "el");
  await expect(page.getByTestId("language-switcher")).toHaveAccessibleName("Γλώσσα");
  await expectNoSeriousViolations(page, "Greek editor");

  const viewUrl = await getViewUrl(page);
  const viewerContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await setStoredLocale(viewerContext, "el");
  const viewer = await viewerContext.newPage();
  await openDeck(viewer, viewUrl, "viewer", "el");
  await expectNoSeriousViolations(viewer, "Greek viewer");

  await viewer.getByTestId("present-button").click();
  await expect(viewer.getByTestId("presentation")).toBeVisible();
  await expectNoSeriousViolations(viewer, "Greek presentation");
  await viewer.keyboard.press("Escape");
  await viewerContext.close();
});

test("shape and emoji pickers pass accessibility checks and keyboard use", async ({
  page,
}) => {
  await createDeck(page);

  await page.getByTestId("tool-shapes").click();
  await expectNoSeriousViolations(page, "shape picker");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("tool-shape-triangle")).toHaveCount(0);

  await page.getByTestId("tool-emoji").click();
  await expectNoSeriousViolations(page, "emoji picker");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("emoji-grin")).toHaveCount(0);

  const trigger = page.getByTestId("tool-shapes");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("tool-shape-triangle")).toBeFocused();

  const hexagon = page.getByTestId("tool-shape-hexagon");
  await page.keyboard.press("h");
  await expect(hexagon).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-pressed", "true");
  await expect(trigger).toHaveAttribute("aria-label", "Shapes: Hexagon");
});
