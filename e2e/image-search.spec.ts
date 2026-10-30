import { expect, test } from "@playwright/test";

import { createDeck, selectElement } from "./helpers";

const PHOTO = {
  id: "photo-e2e",
  provider: "unsplash",
  thumbnailUrl: "https://images.unsplash.com/photo-e2e-small",
  previewUrl: "https://images.unsplash.com/photo-e2e-regular",
  width: 64,
  height: 48,
  photographerName: "Ada Lovelace",
  photographerUrl: "https://unsplash.com/@ada",
  sourceUrl: "https://unsplash.com/photos/photo-e2e",
  alt: "A test mountain",
};

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=";

test("hides stock search when no provider is configured", async ({ page }) => {
  await page.route("**/api/image-search/providers", (route) =>
    route.fulfill({ json: { providers: [] } }),
  );
  await createDeck(page);

  await page.getByTestId("tool-image").click();
  await expect(page.getByTestId("image-upload")).toBeVisible();
  await expect(page.getByTestId("image-search")).toHaveCount(0);
});

test("searches, imports a photo, and shows attribution", async ({ page }) => {
  await page.route("**/api/image-search/providers", (route) =>
    route.fulfill({ json: { providers: ["unsplash", "pexels"] } }),
  );
  await page.route("**/api/decks/*/image-search?*", (route) =>
    route.fulfill({
      json: {
        provider: "unsplash",
        query: "mountain",
        page: 1,
        hasMore: false,
        results: [PHOTO],
      },
    }),
  );
  await page.route("**/api/decks/*/image-search/import", (route) =>
    route.fulfill({
      status: 201,
      json: {
        asset: {
          id: "asset-e2e-1",
          url: "/api/assets/asset-e2e-1",
          mimeType: "image/png",
          width: 64,
          height: 48,
        },
        credit: {
          provider: "unsplash",
          photographerName: "Ada Lovelace",
          photographerUrl: "https://unsplash.com/@ada",
          sourceUrl: "https://unsplash.com/photos/photo-e2e",
        },
      },
    }),
  );
  await page.route("**/api/assets/asset-e2e-1", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(ONE_PIXEL_PNG, "base64"),
    }),
  );

  await createDeck(page);
  await page.getByTestId("tool-image").click();
  await page.getByTestId("image-search").click();

  const dialog = page.getByTestId("image-search-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("image-provider-unsplash")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("image-provider-pexels")).toBeVisible();

  await page.getByTestId("image-search-input").fill("mountain");
  await page.getByTestId("image-search-submit").click();
  await expect(page.getByTestId("image-result-photo-e2e")).toBeVisible();
  await expect(page.getByTestId("image-credit")).toContainText(
    "Photo by Ada Lovelace on Unsplash",
  );

  await page.getByTestId("image-result-photo-e2e").click();
  await expect(dialog).toHaveCount(0);

  const imageElement = page.locator(
    '[data-testid="element-list"] button[data-element-type="image"]',
  );
  await expect(imageElement).toHaveCount(1);
  await selectElement(page, 0);
  await expect(page.getByTestId("style-image-credit")).toContainText(
    "Photo by Ada Lovelace on Unsplash",
  );
  await expect(page.getByTestId("style-image-credit").getByRole("link")).toHaveAttribute(
    "rel",
    /noopener noreferrer/,
  );

  await page.waitForTimeout(500);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("editor-workspace")).toHaveAttribute(
    "data-role",
    "editor",
  );
  await selectElement(page, 0);
  await expect(page.getByTestId("style-image-credit")).toContainText(
    "Photo by Ada Lovelace on Unsplash",
  );
});
