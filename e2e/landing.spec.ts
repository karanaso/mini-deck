import { expect, test } from "@playwright/test";

import { collectPageErrors, createDeck } from "./helpers";

test("landing creates a deck, remembers it, removes it, and keeps the link valid", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  const deck = await createDeck(page);

  await expect(page.getByTestId("deck-title")).toHaveValue("Untitled deck");
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByTestId("recent-deck")).toHaveCount(1);
  await expect(page.getByTestId("recent-deck")).toContainText("Untitled deck");

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("recent-deck")).toHaveCount(1);

  await page.getByRole("button", { name: /Remove Untitled deck from recents/ }).click();
  await expect(page.getByTestId("recent-deck")).toHaveCount(0);

  await page.goto(deck.url, { waitUntil: "networkidle" });
  await expect(page.getByTestId("editor-workspace")).toBeVisible();
  expect(errors).toEqual([]);
});

test("login is never required and storage corruption is recoverable", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("mini-deck:recent-decks", "{broken");
  });
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("No decks yet")).toBeVisible();
  await expect(page.getByRole("button", { name: "New deck" })).toBeVisible();
  await expect(page.getByText("No account needed")).toBeVisible();
});
