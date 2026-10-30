import { expect, test } from "@playwright/test";

import {
  createDeck,
  getViewUrl,
  makeDeckLegacy,
  openDeck,
  setDeckJoinCode,
  waitForDeckReady,
} from "./helpers";

test("edit link asks for the PIN, rejects a wrong PIN, and remembers the unlock", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const editor = await context.newPage();
  await editor.goto(deck.url, { waitUntil: "networkidle" });

  const gate = editor.getByTestId("pin-gate");
  await expect(gate).toBeVisible();
  await editor.getByTestId("pin-input").fill("000000");
  await editor.getByTestId("pin-submit").click();
  await expect(editor.getByTestId("pin-error")).toContainText("not valid");
  await expect(editor.getByTestId("editor-workspace")).toHaveCount(0);

  await editor.getByTestId("pin-input").fill(deck.editPin);
  await editor.getByTestId("pin-submit").click();
  await waitForDeckReady(editor, "editor");

  await editor.reload({ waitUntil: "networkidle" });
  await waitForDeckReady(editor, "editor");
  await expect(editor.getByTestId("pin-gate")).toHaveCount(0);
  await context.close();
});

test("view link requires the view PIN and keeps the viewer read-only", async ({
  page,
  browser,
}) => {
  await createDeck(page);
  const viewUrl = await getViewUrl(page);
  const deckId = viewUrl.match(/\/d\/([^#/?]+)/)?.[1];
  expect(deckId).toBeTruthy();
  const deck = await page.evaluate((id) => {
    const raw = window.localStorage.getItem("mini-deck:deck-access");
    const entries = raw ? (JSON.parse(raw) as Array<{ deckId: string; viewPin: string; editPin: string }>) : [];
    return entries.find((entry) => entry.deckId === id) ?? null;
  }, deckId);
  expect(deck).not.toBeNull();

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const viewer = await context.newPage();
  await viewer.goto(viewUrl, { waitUntil: "networkidle" });

  await viewer.getByTestId("pin-input").fill(deck!.editPin);
  await viewer.getByTestId("pin-submit").click();
  await expect(viewer.getByTestId("pin-error")).toContainText("not valid");

  await viewer.getByTestId("pin-input").fill(deck!.viewPin);
  await viewer.getByTestId("pin-submit").click();
  await waitForDeckReady(viewer, "viewer");
  await expect(viewer.getByTestId("share-button")).toHaveCount(0);
  await context.close();
});

test("joins by code with a leading zero, shows the title, and shares code/PINs", async ({
  page,
  browser,
}) => {
  const deck = await createDeck(page);
  const joinCode = `000${Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, "0")}`;
  await setDeckJoinCode(deck.deckId, joinCode);

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const editor = await context.newPage();
  await editor.goto("/", { waitUntil: "networkidle" });
  await editor.getByTestId("join-deck-button").click();
  await editor.getByTestId("join-code-input").fill(joinCode);
  await editor.getByTestId("join-code-submit").click();

  await expect(editor.getByTestId("join-deck-title")).toHaveText("Untitled deck");
  await editor.getByTestId("join-role-edit").click();
  await editor.getByTestId("join-pin-input").fill(deck.editPin);
  await editor.getByTestId("join-pin-submit").click();
  await waitForDeckReady(editor, "editor");

  await editor.getByTestId("share-button").click();
  await expect(editor.getByTestId("share-dialog")).toContainText(
    "opened with a join code",
  );
  await expect(editor.getByTestId("edit-link-url")).toHaveCount(0);
  await expect(editor.getByTestId("share-join-code")).toHaveCount(0);
  await expect(editor.getByTestId("reset-access")).toBeVisible();

  await editor.keyboard.press("Escape");
  await editor.getByTestId("deck-title").fill("Shared from code");
  await editor.getByTestId("deck-title").press("Enter");
  await expect(page.getByTestId("deck-title")).toHaveValue("Shared from code");
  await context.close();
});

test("reset rotates the code and PINs and invalidates old access", async ({
  page,
  browser,
}) => {
  await createDeck(page);
  const viewUrl = await getViewUrl(page);
  const oldAccess = await page.evaluate(() => {
    const raw = window.localStorage.getItem("mini-deck:deck-access");
    const entries = raw
      ? (JSON.parse(raw) as Array<{ joinCode: string; editPin: string; viewPin: string }>)
      : [];
    return entries[0] ?? null;
  });
  expect(oldAccess).not.toBeNull();

  const viewerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const viewer = await viewerContext.newPage();
  await viewer.goto(viewUrl, { waitUntil: "networkidle" });
  await viewer.getByTestId("pin-input").fill(oldAccess!.viewPin);
  await viewer.getByTestId("pin-submit").click();
  await waitForDeckReady(viewer, "viewer");

  await page.getByTestId("share-button").click();
  await page.getByTestId("reset-access").click();
  await page.getByTestId("reset-access-confirm").click();
  await expect(page.getByTestId("share-dialog")).toHaveCount(0);
  await waitForDeckReady(page, "editor");

  await page.getByTestId("share-button").click();
  const newEditPin = (await page.getByTestId("share-edit-pin").innerText()).trim();
  const newViewPin = (await page.getByTestId("share-view-pin").innerText()).trim();
  const newJoinCode = (await page.getByTestId("share-join-code").innerText()).trim();
  expect(newEditPin).not.toBe(oldAccess!.editPin);
  expect(newViewPin).not.toBe(oldAccess!.viewPin);
  expect(newJoinCode).not.toBe(oldAccess!.joinCode);
  await page.keyboard.press("Escape");

  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByTestId("join-deck-button").click();
  await page.getByTestId("join-code-input").fill(oldAccess!.joinCode);
  await page.getByTestId("join-code-submit").click();
  await expect(page.getByTestId("join-error")).toContainText("could not be found");

  await viewer.reload({ waitUntil: "domcontentloaded" });
  await expect(viewer.getByTestId("pin-gate")).toBeVisible();
  await viewer.getByTestId("pin-input").fill(oldAccess!.viewPin);
  await viewer.getByTestId("pin-submit").click();
  await expect(viewer.getByTestId("pin-error")).toContainText("not valid");

  await viewer.getByTestId("pin-input").fill(newViewPin);
  await viewer.getByTestId("pin-submit").click();
  await waitForDeckReady(viewer, "viewer");
  await viewerContext.close();
});

test("legacy decks open from links without a PIN", async ({ page, browser }) => {
  const deck = await createDeck(page);
  const viewUrl = await getViewUrl(page);
  await makeDeckLegacy(deck.deckId);

  const editorContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const editor = await editorContext.newPage();
  await openDeck(editor, deck.url, "editor");
  await expect(editor.getByTestId("pin-gate")).toHaveCount(0);
  await editorContext.close();

  const viewerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const viewer = await viewerContext.newPage();
  await openDeck(viewer, viewUrl, "viewer");
  await expect(viewer.getByTestId("pin-gate")).toHaveCount(0);
  await viewerContext.close();
});
