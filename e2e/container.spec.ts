import { expect, test } from "@playwright/test";
import sharp from "sharp";

import {
  addText,
  collectPageErrors,
  createDeck,
  elementCount,
  openDeck,
  pdfPageCount,
} from "./helpers";

test("single container: two editors, image upload, PDF export, and CSP", async ({
  page,
  browser,
}) => {
  const pageErrors = collectPageErrors(page);

  let deck: { url: string; deckId: string; editToken: string };
  const existingDeckUrl = process.env.CONTAINER_DECK_URL;
  if (existingDeckUrl) {
    const match = existingDeckUrl.match(/\/d\/([^#]+)#(.+)$/);
    if (!match) {
      throw new Error(
        "CONTAINER_DECK_URL must look like http://host/d/<deck-id>#<edit-token>",
      );
    }
    deck = {
      url: existingDeckUrl,
      deckId: match[1],
      editToken: match[2],
    };
    await openDeck(page, existingDeckUrl);
  } else {
    deck = await createDeck(page);
  }

  const secondContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const second = await secondContext.newPage();
  const secondErrors = collectPageErrors(second);

  try {
    await openDeck(second, deck.url);

    await page.getByTestId("deck-title").fill("Container smoke deck");
    await page.getByTestId("deck-title").press("Enter");
    await expect(second.getByTestId("deck-title")).toHaveValue(
      "Container smoke deck",
    );

    await addText(second, { x: 360, y: 260 }, "From the second editor");
    await expect.poll(() => elementCount(page)).toBe(1);

    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 36, g: 99, b: 235 },
      },
    })
      .png()
      .toBuffer();

    await page.getByTestId("image-input").setInputFiles({
      name: "smoke.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect.poll(() => elementCount(page)).toBe(2);
    await expect.poll(() => elementCount(second)).toBe(2);

    await page.getByTestId("export-menu").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-pdf").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);

    const pdfBuffer = await download.createReadStream().then(async (stream) => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    });
    expect(await pdfPageCount(pdfBuffer)).toBe(1);

    const cspErrors = [...pageErrors, ...secondErrors].filter((message) =>
      /content security policy|refused to connect/i.test(message),
    );
    expect(cspErrors).toEqual([]);
  } finally {
    await secondContext.close();
  }
});
