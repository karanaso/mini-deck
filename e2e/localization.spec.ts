import { expect, test } from "@playwright/test";

import {
  addText,
  createDeck,
  drawElement,
  elementCount,
  getShareUrl,
  getViewUrl,
  openDeck,
  pasteEnvelope,
  selectElement,
  setStoredLocale,
  switchLanguage,
  waitForDeckReady,
} from "./helpers";

test.describe("Greek browser detection", () => {
  test.use({ locale: "el-GR" });

  test("starts in Greek and persists a manual language choice", async ({
    page,
    context,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.locator("html")).toHaveAttribute("lang", "el");
    await expect(page).toHaveTitle(/Μικρά deck/);
    await expect(page.getByRole("button", { name: "Νέο deck" })).toBeVisible();
    await expect(page.getByText("Χωρίς λογαριασμό")).toBeVisible();
    await expect(page.getByRole("button", { name: "New deck" })).toHaveCount(0);

    await switchLanguage(page, "en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("button", { name: "New deck" })).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("No account needed")).toBeVisible();

    await switchLanguage(page, "el");
    await expect(page.locator("html")).toHaveAttribute("lang", "el");

    const cookies = await context.cookies();
    const localeCookie = cookies.find((cookie) => cookie.name === "mini-deck-locale");
    expect(localeCookie).toMatchObject({ value: "el", path: "/", sameSite: "Lax" });
    expect(localeCookie?.expires).toBeGreaterThan(
      Date.now() / 1000 + 300 * 24 * 60 * 60,
    );
  });
});

test("switches the landing page and deck chrome to Greek and carries it into share links", async ({
  page,
}) => {
  const deck = await createDeck(page);
  await page.goto("/", { waitUntil: "networkidle" });

  await switchLanguage(page, "el");
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  await expect(page.getByText("Πρόσφατα deck")).toBeVisible();
  await expect(page.getByRole("button", { name: "Άνοιγμα Untitled deck" })).toBeVisible();
  await expect(page.getByTestId("recent-deck")).toContainText("τώρα");

  await page.goto(deck.url, { waitUntil: "networkidle" });
  await waitForDeckReady(page, "editor", "el");
  await expect(page.getByRole("button", { name: "Κοινοποίηση" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Παρουσίαση" })).toBeVisible();
  await expect(page.getByText("Διαφάνειες")).toBeVisible();
  await expect(page.getByTestId("language-switcher")).toHaveAccessibleName("Γλώσσα");
  await expect(page.getByRole("button", { name: "Share" })).toHaveCount(0);

  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-dialog")).toContainText(
    "Κοινοποίηση αυτού του deck",
  );
  await expect(page.getByTestId("share-dialog")).toContainText(
    "Όποιος έχει έναν σύνδεσμο",
  );
  const editUrl = new URL(await page.getByTestId("edit-link-url").inputValue());
  const viewUrl = new URL(await page.getByTestId("view-link-url").inputValue());
  expect(editUrl.pathname).toBe(`/d/${deck.deckId}`);
  expect(editUrl.searchParams.get("lang")).toBe("el");
  expect(editUrl.hash).toBe(`#${deck.editToken}`);
  expect(viewUrl.pathname).toBe(`/d/${deck.deckId}`);
  expect(viewUrl.searchParams.get("lang")).toBe("el");
  expect(viewUrl.hash).not.toBe(editUrl.hash);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("share-dialog")).toHaveCount(0);

  await page.getByTestId("present-button").click();
  await expect(page.getByTestId("presentation")).toBeVisible();
  await expect(page.getByText(/Χρησιμοποίησε τα βέλη ή το Space/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Έξοδος από την παρουσίαση" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presentation")).toHaveCount(0);

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByText("Πρόσφατα deck")).toBeVisible();
});

test("share links follow the dialog language without closing it", async ({ page }) => {
  const deck = await createDeck(page);
  await page.getByTestId("share-button").click();
  const dialog = page.getByTestId("share-dialog");
  await expect(dialog).toBeVisible();

  const englishEdit = new URL(await page.getByTestId("edit-link-url").inputValue());
  const englishView = new URL(await page.getByTestId("view-link-url").inputValue());
  expect(englishEdit.searchParams.get("lang")).toBe("en");
  expect(englishView.searchParams.get("lang")).toBe("en");

  await page.getByTestId("share-dialog-language-switcher").click();
  await page.getByTestId("language-option-el").click();

  await expect(dialog).toBeVisible();
  await expect
    .poll(async () => {
      const value = await page.getByTestId("edit-link-url").inputValue();
      return value ? new URL(value).searchParams.get("lang") : null;
    })
    .toBe("el");
  await expect
    .poll(async () => {
      const value = await page.getByTestId("view-link-url").inputValue();
      return value ? new URL(value).searchParams.get("lang") : null;
    })
    .toBe("el");

  const greekEdit = new URL(await page.getByTestId("edit-link-url").inputValue());
  const greekView = new URL(await page.getByTestId("view-link-url").inputValue());
  expect(greekEdit.pathname).toBe(`/d/${deck.deckId}`);
  expect(greekEdit.searchParams.get("lang")).toBe("el");
  expect(greekEdit.hash).toBe(`#${deck.editToken}`);
  expect(greekView.searchParams.get("lang")).toBe("el");
  expect(greekView.hash).not.toBe(greekEdit.hash);
  await expect(dialog).toBeVisible();
});

test("viewers see Greek chrome and Greek read-only feedback", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  const viewUrl = await getShareUrl(page, "view", "el");

  const viewerContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await setStoredLocale(viewerContext, "el");
  const viewer = await viewerContext.newPage();
  await openDeck(viewer, viewUrl, "viewer", "el");

  await expect(viewer.getByText("Μόνο προβολή")).toBeVisible();
  await expect(viewer.getByTestId("share-button")).toHaveCount(0);
  await expect(viewer.getByTestId("tool-select")).toHaveCount(0);
  await expect(viewer.getByTestId("present-button")).toContainText("Παρουσίαση");
  await expect(viewer.getByTestId("language-switcher")).toHaveAccessibleName("Γλώσσα");

  await selectElement(viewer, 0);
  await viewer.keyboard.press("Delete");
  await expect(viewer.getByText("Αυτό το deck είναι μόνο για ανάγνωση")).toBeVisible();
  await expect.poll(() => elementCount(viewer)).toBe(1);

  await viewerContext.close();
  expect(deck.deckId).toBeTruthy();
});

test("a Greek edit share link opens in Greek before the first interaction", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  const greekUrl = await getShareUrl(page, "edit", "el");

  const recipientContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const recipient = await recipientContext.newPage();
  const response = await recipient.goto(greekUrl, { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);

  await expect(recipient.locator("html")).toHaveAttribute("lang", "el");
  await waitForDeckReady(recipient, "editor", "el");
  await expect(recipient.getByRole("button", { name: "Κοινοποίηση" })).toBeVisible();
  await expect(recipient.getByRole("button", { name: "Share" })).toHaveCount(0);

  const opened = new URL(recipient.url());
  expect(opened.pathname).toBe(`/d/${deck.deckId}`);
  expect(opened.searchParams.has("lang")).toBe(false);
  expect(opened.hash).toBe(`#${deck.editToken}`);

  const cookie = (await recipientContext.cookies()).find(
    (entry) => entry.name === "mini-deck-locale",
  );
  expect(cookie?.value).toBe("el");

  await recipient.reload({ waitUntil: "networkidle" });
  await expect(recipient.locator("html")).toHaveAttribute("lang", "el");
  await waitForDeckReady(recipient, "editor", "el");

  await recipientContext.close();
});

test("link language overrides stored and browser language preferences", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  const englishUrl = await getShareUrl(page, "edit", "en");
  const greekUrl = await getShareUrl(page, "edit", "el");

  const greekContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "el-GR",
  });
  await setStoredLocale(greekContext, "el");
  const greekPage = await greekContext.newPage();
  await greekPage.goto(englishUrl, { waitUntil: "networkidle" });
  await expect(greekPage.locator("html")).toHaveAttribute("lang", "en");
  await waitForDeckReady(greekPage, "editor", "en");
  expect(
    (await greekContext.cookies()).find((entry) => entry.name === "mini-deck-locale")
      ?.value,
  ).toBe("en");
  await greekContext.close();

  const englishContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  await setStoredLocale(englishContext, "en");
  const englishPage = await englishContext.newPage();
  await englishPage.goto(greekUrl, { waitUntil: "networkidle" });
  await expect(englishPage.locator("html")).toHaveAttribute("lang", "el");
  await waitForDeckReady(englishPage, "editor", "el");
  expect(
    (await englishContext.cookies()).find(
      (entry) => entry.name === "mini-deck-locale",
    )?.value,
  ).toBe("el");
  await englishContext.close();

  expect(deck.deckId).toBeTruthy();
});

test("a Greek view share link opens read-only with Greek chrome", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  const greekViewUrl = await getShareUrl(page, "view", "el");

  const viewerContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const viewer = await viewerContext.newPage();
  await viewer.goto(greekViewUrl, { waitUntil: "networkidle" });

  await expect(viewer.locator("html")).toHaveAttribute("lang", "el");
  await waitForDeckReady(viewer, "viewer", "el");
  await expect(viewer.getByText("Μόνο προβολή")).toBeVisible();
  await expect(viewer.getByTestId("share-button")).toHaveCount(0);
  await expect(viewer.getByTestId("tool-select")).toHaveCount(0);

  const opened = new URL(viewer.url());
  expect(opened.searchParams.has("lang")).toBe(false);
  expect(opened.hash).not.toBe(`#${deck.editToken}`);
  expect(
    (await viewerContext.cookies()).find(
      (entry) => entry.name === "mini-deck-locale",
    )?.value,
  ).toBe("el");

  await selectElement(viewer, 0);
  await viewer.keyboard.press("Delete");
  await expect(viewer.getByText("Αυτό το deck είναι μόνο για ανάγνωση")).toBeVisible();
  await expect.poll(() => elementCount(viewer)).toBe(1);

  await viewerContext.close();
});

test("invalid link language and old links keep the existing resolution", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  const invalidUrl = new URL(deck.url);
  invalidUrl.searchParams.set("lang", "fr");

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const recipient = await context.newPage();

  await recipient.goto(invalidUrl.toString(), { waitUntil: "networkidle" });
  await expect(recipient.locator("html")).toHaveAttribute("lang", "en");
  await waitForDeckReady(recipient, "editor", "en");
  expect(new URL(recipient.url()).searchParams.get("lang")).toBe("fr");

  await setStoredLocale(context, "el");
  await recipient.goto(deck.url, { waitUntil: "networkidle" });
  await expect(recipient.locator("html")).toHaveAttribute("lang", "el");
  await waitForDeckReady(recipient, "editor", "el");

  await context.close();
});

test("a manual switch after a language-bearing link wins on reload", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  const greekUrl = await getShareUrl(page, "edit", "el");

  const recipientContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const recipient = await recipientContext.newPage();
  await recipient.goto(greekUrl, { waitUntil: "networkidle" });
  await waitForDeckReady(recipient, "editor", "el");

  await switchLanguage(recipient, "en");
  await expect(recipient.locator("html")).toHaveAttribute("lang", "en");
  await recipient.reload({ waitUntil: "networkidle" });
  await expect(recipient.locator("html")).toHaveAttribute("lang", "en");
  await waitForDeckReady(recipient, "editor", "en");
  expect(new URL(recipient.url()).searchParams.has("lang")).toBe(false);

  await recipientContext.close();
  expect(deck.deckId).toBeTruthy();
});

test("Greek invalid links and missing routes use Greek error screens", async ({ page }) => {
  await setStoredLocale(page.context(), "el");

  await page.goto("/d/does-not-exist", { waitUntil: "networkidle" });
  await expect(
    page.getByText("Αυτός ο σύνδεσμος δεν μπορεί να ανοίξει το deck"),
  ).toBeVisible();

  await page.goto("/this-route-does-not-exist", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  await expect(page.getByText("Αυτό το deck δεν είναι διαθέσιμο")).toBeVisible();
  await expect(page.getByText("Επιστροφή στο Mini Deck")).toBeVisible();
});

test("Greek validation and API failures never show the server's English text", async ({
  page,
}) => {
  const deck = await createDeck(page);
  await setStoredLocale(page.context(), "el");

  await page.route("**/api/decks", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "rate_limited",
            message: "Too many decks created. Try again shortly.",
          },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Νέο deck" }).click();
  await expect(page.getByText("Πολλές προσπάθειες. Δοκίμασε ξανά σύντομα.")).toBeVisible();
  await expect(
    page.getByText("Too many decks created. Try again shortly."),
  ).toHaveCount(0);
  await page.unroute("**/api/decks");

  await page.goto(deck.url, { waitUntil: "networkidle" });
  await waitForDeckReady(page, "editor", "el");

  await page.getByTestId("image-input").setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(15 * 1024 * 1024),
  });
  await expect(
    page.getByText("Οι εικόνες πρέπει να είναι 10 MB ή μικρότερες."),
  ).toBeVisible();

  await page.getByTestId("image-input").setInputFiles({
    name: "vector.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg></svg>"),
  });
  await expect(page.getByText("Χρησιμοποίησε εικόνα PNG, JPEG ή WebP.")).toBeVisible();
});

test("Greek PDF export failure is localized and downloads nothing", async ({ page }) => {
  const deck = await createDeck(page);
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

  await setStoredLocale(page.context(), "el");
  const greek = await page.context().newPage();
  await greek.goto(deck.url, { waitUntil: "networkidle" });
  await waitForDeckReady(greek, "editor", "el");
  await expect.poll(() => elementCount(greek)).toBe(1);

  const download = greek
    .waitForEvent("download", { timeout: 2500 })
    .then(() => true)
    .catch(() => false);
  await greek.getByTestId("export-menu").click();
  await greek.getByTestId("export-pdf").click();
  await expect(
    greek.getByText("Δεν ήταν δυνατή η φόρτωση μιας εικόνας. Η εξαγωγή ακυρώθηκε."),
  ).toBeVisible();
  expect(await download).toBe(false);
});

test("mixed-language collaborators see their own chrome and the same deck content", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);

  const greekContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await setStoredLocale(greekContext, "el");
  const greek = await greekContext.newPage();
  await openDeck(greek, deck.url, "editor", "el");

  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(greek.getByRole("button", { name: "Κοινοποίηση" })).toBeVisible();
  await expect(page.locator('[data-testid="presence"] button')).toHaveCount(2);
  await expect(greek.locator('[data-testid="presence"] button')).toHaveCount(2);

  await addText(page, { x: 320, y: 260 }, "Shared content");
  await expect
    .poll(() => elementCount(greek))
    .toBe(1);
  await expect(
    greek.locator('[data-testid="element-list"] button').first(),
  ).toHaveAttribute("data-element-text", "Shared content");
  await expect(page.locator('[data-testid="element-list"] button').first()).toHaveAttribute(
    "data-element-text",
    "Shared content",
  );

  await greekContext.close();
});

test("Greek layout fits desktop and mobile widths", async ({ page, browser }) => {
  const deck = await createDeck(page);
  await setStoredLocale(page.context(), "el");

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByText("Κοινοποίηση μόνο με σύνδεσμο")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("language-switcher")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(deck.url, { waitUntil: "networkidle" });
  await waitForDeckReady(page, "editor", "el");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload({ waitUntil: "networkidle" });
  await waitForDeckReady(page, "editor", "el");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByTestId("share-button").click();
  const shareBox = await page.getByTestId("share-dialog").boundingBox();
  expect(shareBox?.width ?? 0).toBeLessThanOrEqual(1440);
  await expect(page.getByTestId("share-dialog")).toContainText(
    "Κοινοποίηση αυτού του deck",
  );
  await page.keyboard.press("Escape");

  const viewUrl = await getViewUrl(page);
  const viewerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await setStoredLocale(viewerContext, "el");
  const viewer = await viewerContext.newPage();
  await openDeck(viewer, viewUrl, "viewer", "el");
  expect(
    await viewer.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await viewer.getByTestId("present-button").click();
  await expect(viewer.getByText(/Χρησιμοποίησε τα βέλη ή το Space/)).toBeVisible();
  expect(
    await viewer.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await viewer.keyboard.press("Escape");
  await viewerContext.close();
});

test("switching language mid-edit keeps the dialog, selection, document, and connection", async ({
  page,
}) => {
  const deck = await createDeck(page);
  await drawElement(page, "rect", { x: 280, y: 340 }, { x: 460, y: 470 });
  await selectElement(page, 0);

  await page.getByTestId("share-button").click();
  await expect(page.getByTestId("share-dialog")).toBeVisible();

  await page.getByTestId("share-dialog-language-switcher").click();
  await page.getByTestId("language-option-el").click();

  await expect(page.getByTestId("share-dialog")).toBeVisible();
  await expect(page.getByTestId("share-dialog")).toContainText(
    "Κοινοποίηση αυτού του deck",
  );
  await expect(page.getByTestId("connection-badge")).toContainText("Ζωντανά");
  await expect(page.getByTestId("slide-0")).toHaveAttribute("data-current", "true");
  await expect(page.locator('[data-testid="element-list"] button')).toHaveCount(1);
  await expect(page.getByTestId("undo")).toBeEnabled();
  await expect(page.getByTestId("style-panel")).toContainText("Ορθογώνιο");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("share-dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Κοινοποίηση" })).toBeVisible();
  await expect(page.locator('[data-testid="element-list"] button')).toHaveCount(1);
  expect(deck.deckId).toBeTruthy();
});

test("Greek shape and emoji pickers use localized names", async ({ page }) => {
  await createDeck(page);
  await switchLanguage(page, "el");
  await expect(page.locator("html")).toHaveAttribute("lang", "el");

  await page.getByTestId("tool-shapes").click();
  await expect(page.getByTestId("tool-shape-triangle")).toContainText("Τρίγωνο");
  await expect(page.getByTestId("tool-shape-pentagon")).toContainText("Πεντάγωνο");
  await page.getByTestId("tool-shape-hexagon").click();
  await expect(page.getByTestId("tool-shapes")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("tool-shapes")).toHaveAttribute(
    "aria-label",
    "Σχήματα: Εξάγωνο",
  );

  await page.getByTestId("tool-emoji").click();
  await expect(page.getByText("Εισαγωγή emoji")).toBeVisible();
  await expect(page.getByTestId("emoji-grin")).toHaveAttribute(
    "aria-label",
    "Εισαγωγή: Χαμογελαστό πρόσωπο",
  );
  await page.getByTestId("emoji-grin").click();
  await expect(
    page.locator('[data-testid="element-list"] button').first(),
  ).toHaveAttribute("data-element-text", "😀");
});
