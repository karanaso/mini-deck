import { expect, test } from "@playwright/test";

import { createDeck, getEditUrlFromShare, getViewUrl, openDeck, waitForDeckReady } from "./helpers";

test("share dialog exposes both links, copies them, and warns about bearer access", async ({
  page,
}) => {
  const deck = await createDeck(page);
  await page.getByTestId("share-button").click();
  const dialog = page.getByTestId("share-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("A link or join code plus its role PIN");

  const editUrl = new URL(await page.getByTestId("edit-link-url").inputValue());
  const viewUrl = new URL(await page.getByTestId("view-link-url").inputValue());
  expect(editUrl.pathname).toBe(`/d/${deck.deckId}`);
  expect(editUrl.searchParams.get("lang")).toBe("en");
  expect(editUrl.hash).toBe(`#${deck.editToken}`);
  expect(viewUrl.pathname).toBe(`/d/${deck.deckId}`);
  expect(viewUrl.searchParams.get("lang")).toBe("en");
  expect(viewUrl.hash).not.toBe(editUrl.hash);
  expect(viewUrl.hash.length).toBeGreaterThan(1);

  await page.getByTestId("view-link-copy").click();
  await expect(page.getByTestId("view-link-copy")).toContainText("Copied");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(viewUrl.toString());

  await page.getByTestId("edit-link-copy").click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(editUrl.toString());
});

test("deck links keep tokens out of the initial request and send security headers", async ({
  page,
}) => {
  const deck = await createDeck(page);
  const editShareUrl = await getEditUrlFromShare(page);
  await page.goto("/", { waitUntil: "networkidle" });
  const initialRequests: string[] = [];
  const documentResponses: Array<{ status: number; location: string | null }> = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") initialRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (response.request().resourceType() === "document") {
      documentResponses.push({
        status: response.status(),
        location: response.headers()["location"] ?? null,
      });
    }
  });
  const sessionAuth: string[] = [];
  const sessionRequest = page.waitForRequest((request) =>
    request.url().includes(`/api/decks/${deck.deckId}/session`),
  );
  page.on("request", (request) => {
    if (request.url().includes(`/api/decks/${deck.deckId}/session`)) {
      sessionAuth.push(request.headers()["authorization"] ?? "");
    }
  });

  const response = await page.goto(editShareUrl, { waitUntil: "networkidle" });
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["cache-control"]).toBe("no-store");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");

  const redirect = documentResponses.find((entry) => entry.status === 307);
  expect(redirect).toBeDefined();
  expect(redirect?.location ?? "").not.toContain(deck.editToken);
  expect(new URL(page.url()).searchParams.has("lang")).toBe(false);
  expect(new URL(page.url()).hash).toBe(`#${deck.editToken}`);

  for (const url of initialRequests) expect(url).not.toContain(deck.editToken);
  const request = await sessionRequest;
  expect(request.url()).not.toContain(deck.editToken);
  expect(request.headers()["authorization"]).toMatch(/^Bearer /);

  await waitForDeckReady(page);
  await expect(page.getByTestId("canvas-stage")).toBeVisible();
  await expect
    .poll(() => sessionAuth.some((value) => value.startsWith("Bearer v1.")))
    .toBe(true);
});

test("tampered and unknown links show the same generic not-found state", async ({ page }) => {
  const deck = await createDeck(page);
  await page.goto("/", { waitUntil: "networkidle" });
  const tampered =
    deck.url.slice(0, -1) + (deck.url.endsWith("a") ? "b" : "a");
  await page.goto(tampered, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("This link can't open the deck")).toBeVisible();
  await expect(page.getByTestId("canvas-stage")).toHaveCount(0);

  const unknown = deck.url.replace(`/d/${deck.deckId}`, "/d/does-not-exist");
  await page.goto(unknown, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("This link can't open the deck")).toBeVisible();
});

test("viewers can open the deck but see no editable recents entry", async ({ page, browser }) => {
  await createDeck(page);
  const viewUrl = await getViewUrl(page);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const viewer = await context.newPage();
  await openDeck(viewer, viewUrl, "viewer");
  await viewer.goto("/", { waitUntil: "networkidle" });
  await expect(viewer.getByTestId("recent-deck")).toHaveCount(0);
  await expect(viewer.getByText("No decks yet")).toBeVisible();
  await context.close();
});

test("clicking a recent deck reopens its editor", async ({ page }) => {
  const deck = await createDeck(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open Untitled deck" }).click();
  await page.waitForURL(deck.url);
  await waitForDeckReady(page);
});
