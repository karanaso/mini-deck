import { expect, test } from "@playwright/test";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as Y from "yjs";

import {
  SHAPE_KINDS,
  addElement,
  createSlide,
  createElementId,
  getOrderedSlideIds,
} from "../packages/deck/dist/index.js";

test.setTimeout(180_000);

function sleep(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

test("loads a 30-slide, 500-element deck within the performance budget", async ({
  page,
  request,
}) => {
  const createdResponse = await request.post("/api/decks");
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()) as {
    deckId: string;
    editToken: string;
    editPin: string;
  };

  const unlockedResponse = await request.post(
    `/api/decks/${created.deckId}/unlock`,
    {
      headers: { authorization: `Bearer ${created.editToken}` },
      data: { pin: created.editPin },
    },
  );
  expect(unlockedResponse.status()).toBe(200);
  const { unlockToken } = (await unlockedResponse.json()) as {
    unlockToken: string;
  };

  const doc = new Y.Doc();
  let provider: HocuspocusProvider;
  const synced = new Promise<void>((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out syncing seed document")), 15_000);
    provider = new HocuspocusProvider({
      url: "ws://localhost:1234",
      name: created.deckId,
      token: unlockToken,
      document: doc,
      WebSocketPolyfill: WebSocket,
      onSynced: ({ state }) => {
        if (!state) return;
        clearTimeout(timeout);
        resolvePromise();
      },
    });
  });
  await synced;

  const slideIds = getOrderedSlideIds(doc);
  while (slideIds.length < 30) {
    slideIds.push(createSlide(doc, slideIds[slideIds.length - 1]));
  }

  let total = 0;
  for (let slideIndex = 0; slideIndex < slideIds.length; slideIndex += 1) {
    const slideId = slideIds[slideIndex];
    for (let elementIndex = 0; elementIndex < 17; elementIndex += 1) {
      const isText = elementIndex < 5;
      const column = elementIndex % 4;
      const row = Math.floor(elementIndex / 4);
      let element: Parameters<typeof addElement>[2];
      if (isText) {
        element = {
          id: createElementId(),
          type: "text",
          x: 80 + column * 450,
          y: 80 + row * 180,
          width: 380,
          height: 90,
          rotation: 0,
          opacity: 1,
          text:
            elementIndex === 0
              ? `😀 Slide ${slideIndex + 1}`
              : `Slide ${slideIndex + 1} text ${elementIndex + 1}`,
          fontSize: elementIndex === 0 ? 72 : 36,
          fill: "#111827",
          align: "left",
        };
      } else if (elementIndex % 3 === 0) {
        element = {
          id: createElementId(),
          type: "rect",
          x: 80 + column * 450,
          y: 80 + row * 180,
          width: 260,
          height: 120,
          rotation: elementIndex % 7,
          opacity: 1,
          fill: "#dbeafe",
          stroke: "#2563eb",
          strokeWidth: 3,
          cornerRadius: 12,
        };
      } else if (elementIndex % 3 === 1) {
        element = {
          id: createElementId(),
          type: "shape",
          shape: SHAPE_KINDS[(slideIndex + elementIndex) % SHAPE_KINDS.length],
          x: 80 + column * 450,
          y: 80 + row * 180,
          width: 260,
          height: 120,
          rotation: elementIndex % 7,
          opacity: 1,
          fill: "#ede9fe",
          stroke: "#7c3aed",
          strokeWidth: 3,
        };
      } else {
        element = {
          id: createElementId(),
          type: "line",
          x: 80 + column * 450,
          y: 80 + row * 180,
          width: 260,
          height: 120,
          rotation: elementIndex % 7,
          opacity: 1,
          stroke: "#0f172a",
          strokeWidth: 4,
          flipX: false,
          flipY: false,
        };
      }
      addElement(doc, slideId, element);
      total += 1;
    }
  }
  expect(total).toBe(510);
  await sleep(2500);
  provider!.destroy();
  doc.destroy();
  await sleep(600);

  const url = `/d/${created.deckId}#${created.editToken}`;
  const initialStarted = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByTestId("pin-input").fill(created.editPin);
  await page.getByTestId("pin-submit").click();
  await expect(page.getByTestId("canvas-stage")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("connection-badge")).toContainText("Live", {
    timeout: 20_000,
  });
  await expect(page.locator('[data-testid^="slide-"]')).toHaveCount(30);
  const initialLoadMs = Date.now() - initialStarted;

  await expect(page.locator('[data-testid^="slide-"] img')).toHaveCount(30, {
    timeout: 30_000,
  });
  const thumbnailsMs = Date.now() - initialStarted;

  const switchStarted = Date.now();
  await page.getByTestId("slide-15").click();
  await expect(page.getByTestId("slide-15")).toHaveAttribute("data-current", "true");
  const slideSwitchMs = Date.now() - switchStarted;

  const pdfStarted = Date.now();
  await page.getByTestId("export-menu").click();
  const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByTestId("export-pdf").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const pdfMs = Date.now() - pdfStarted;

  expect(initialLoadMs).toBeLessThan(15_000);
  expect(slideSwitchMs).toBeLessThan(3_000);
  expect(thumbnailsMs).toBeLessThan(30_000);
  expect(pdfMs).toBeLessThan(60_000);

  const report = `# Performance baseline

Fixture: 30 slides, 510 elements, no images, local PGlite + local filesystem storage. Production build on the development machine. Timings are single-run observations from the Playwright performance test.

| Operation | Observed | Budget |
| --- | --- | --- |
| Initial deck load (canvas + Live + slide rail) | ${initialLoadMs} ms | < 15,000 ms |
| All 30 thumbnails available (from navigation) | ${thumbnailsMs} ms | < 30,000 ms |
| Switch to slide 16 | ${slideSwitchMs} ms | < 3,000 ms |
| Export 30-slide PDF | ${pdfMs} ms | < 60,000 ms |

The initial load includes syncing the 510-element Yjs snapshot, mounting the canvas, and rendering the slide rail. PDF export renders each slide sequentially at 1920×1080 before embedding it in the PDF.
`;
  await writeFile(resolve(process.cwd(), "docs/performance.md"), report);
});
