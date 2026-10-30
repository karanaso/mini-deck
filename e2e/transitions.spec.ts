import { expect, test } from "@playwright/test";

import { addSlide, createDeck, openDeck } from "./helpers";

async function chooseTransition(
  page: Parameters<typeof createDeck>[0],
  transition: "fade" | "push" | "zoom",
) {
  await page.getByTestId("transition-menu").click();
  await page.getByTestId(`transition-option-${transition}`).click();
}

test("persists a slide transition and plays it in presentation", async ({
  page,
}) => {
  await createDeck(page);
  await addSlide(page);
  await expect(page.getByTestId("slide-1")).toHaveAttribute("data-current", "true");
  await chooseTransition(page, "push");
  await expect(page.getByTestId("transition-menu")).toHaveAccessibleName(
    "Slide transition: Push",
  );

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("editor-workspace")).toHaveAttribute(
    "data-role",
    "editor",
  );
  await page.getByRole("button", { name: "Go to slide 2" }).click();
  await expect(page.getByTestId("transition-menu")).toHaveAccessibleName(
    "Slide transition: Push",
  );

  await page.getByRole("button", { name: "Go to slide 1" }).click();
  await page.getByTestId("present-button").click();
  await expect(page.getByTestId("presentation")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  const presentation = page.getByTestId("presentation");
  await expect(presentation).toHaveAttribute("data-transition", "push");
  await expect(presentation).toHaveAttribute("data-animating", "true");
  await expect(presentation).toHaveAttribute("data-direction", "forward");
  await expect(page.getByTestId("presentation-outgoing")).toBeVisible();
  await expect(page.getByTestId("presentation-incoming")).toBeVisible();

  await expect(presentation).toHaveAttribute("data-animating", "false", {
    timeout: 3000,
  });
  await expect(page.getByTestId("presentation")).toContainText("2 / 2");
  await expect(page.getByTestId("presentation-outgoing")).toHaveCount(0);
});

test("settles on the last requested slide during rapid navigation", async ({
  page,
}) => {
  await createDeck(page);
  await addSlide(page);
  await addSlide(page);
  await chooseTransition(page, "push");
  await page.getByRole("button", { name: "Go to slide 1" }).click();
  await page.getByTestId("present-button").click();

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");

  await expect(page.getByTestId("presentation")).toContainText("3 / 3");
  await expect(page.getByTestId("presentation-incoming")).toHaveAttribute(
    "data-slide-id",
    /.+/,
  );
  await expect(page.getByTestId("presentation")).toHaveAttribute(
    "data-animating",
    "false",
    { timeout: 3000 },
  );
  await expect(page.getByTestId("presentation-outgoing")).toHaveCount(0);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("switches slides instantly", async ({ page }) => {
    await createDeck(page);
    await addSlide(page);
    await chooseTransition(page, "zoom");
    await page.getByRole("button", { name: "Go to slide 1" }).click();
    await page.getByTestId("present-button").click();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("presentation")).toHaveAttribute(
      "data-animating",
      "false",
    );
    await expect(page.getByTestId("presentation")).toContainText("2 / 2");
  });
});

test("shows the stored transition only to editors", async ({ page, browser }) => {
  const deck = await createDeck(page);
  await addSlide(page);
  await chooseTransition(page, "fade");

  await page.getByTestId("share-button").click();
  const viewUrl = await page.getByTestId("view-link-url").inputValue();
  await page.keyboard.press("Escape");

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const viewer = await context.newPage();
  await openDeck(viewer, viewUrl, "viewer");
  await expect(viewer.getByTestId("transition-menu")).toHaveCount(0);
  await context.close();

  expect(deck.deckId).toBeTruthy();
});
