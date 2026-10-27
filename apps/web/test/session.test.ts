import { deriveViewToken } from "@mini-deck/deck";
import { describe, expect, it } from "vitest";

import { buildDeckLinks } from "@/lib/session";

const DECK_ID = "deck-abc123";
const EDIT_TOKEN = "A".repeat(43);
const ORIGIN = "https://decks.example.com";

describe("buildDeckLinks", () => {
  it("puts the English locale before the fragment and preserves the edit token", async () => {
    const { editUrl } = await buildDeckLinks(DECK_ID, EDIT_TOKEN, "en", ORIGIN);

    expect(editUrl.startsWith(`${ORIGIN}/d/${DECK_ID}?lang=en#`)).toBe(true);
    expect(editUrl.indexOf("?lang=en")).toBeLessThan(editUrl.indexOf("#"));
    expect(new URL(editUrl).searchParams.get("lang")).toBe("en");
    expect(new URL(editUrl).hash).toBe(`#${EDIT_TOKEN}`);
  });

  it("puts the Greek locale on both links", async () => {
    const { editUrl, viewUrl } = await buildDeckLinks(DECK_ID, EDIT_TOKEN, "el", ORIGIN);

    expect(new URL(editUrl).searchParams.get("lang")).toBe("el");
    expect(new URL(viewUrl).searchParams.get("lang")).toBe("el");
    expect(new URL(viewUrl).pathname).toBe(`/d/${DECK_ID}`);
  });

  it("preserves the derived view token in the fragment", async () => {
    const viewToken = await deriveViewToken(EDIT_TOKEN, DECK_ID);
    const { editUrl, viewUrl } = await buildDeckLinks(DECK_ID, EDIT_TOKEN, "en", ORIGIN);

    expect(viewUrl).not.toBe(editUrl);
    expect(new URL(viewUrl).hash).toBe(`#${viewToken}`);
    expect(new URL(editUrl).hash).toBe(`#${EDIT_TOKEN}`);
    expect(new URL(editUrl).hash).not.toBe(new URL(viewUrl).hash);
  });

  it("falls back to the local development origin outside the browser", async () => {
    const { editUrl } = await buildDeckLinks(DECK_ID, EDIT_TOKEN, "en");

    expect(editUrl.startsWith(`http://localhost:3000/d/${DECK_ID}?lang=en#`)).toBe(true);
  });
});
