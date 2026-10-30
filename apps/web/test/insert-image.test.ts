import { describe, expect, it, vi } from "vitest";

import {
  createInitialDeckDoc,
  getOrderedSlideIds,
  getSlideData,
} from "@mini-deck/deck";

import { placeImageAsset } from "@/lib/insert-image";

describe("placeImageAsset", () => {
  it("centers a landscape image and preserves its aspect ratio", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const selectOnly = vi.fn();
    const stopCapturing = vi.fn();

    const id = placeImageAsset({
      doc,
      slideId,
      asset: { id: "asset-landscape", width: 2400, height: 1200 },
      selectOnly,
      undoManager: { stopCapturing },
    });

    const image = getSlideData(doc, slideId)?.elements[0];
    expect(image).toMatchObject({
      id,
      type: "image",
      assetId: "asset-landscape",
      width: 1200,
      height: 600,
      x: (1920 - 1200) / 2,
      y: (1080 - 600) / 2,
    });
    expect(selectOnly).toHaveBeenCalledWith(id);
    expect(stopCapturing).toHaveBeenCalledTimes(1);
  });

  it("fits a tall image inside the slide box", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];

    placeImageAsset({
      doc,
      slideId,
      asset: { id: "asset-portrait", width: 800, height: 1600 },
      selectOnly: vi.fn(),
      undoManager: { stopCapturing: vi.fn() },
    });

    const image = getSlideData(doc, slideId)?.elements[0];
    expect(image).toMatchObject({ width: 338, height: 675 });
    expect(image && "x" in image ? image.x : 0).toBeGreaterThan(0);
  });

  it("does not upscale small images and stores credit", () => {
    const doc = createInitialDeckDoc();
    const slideId = getOrderedSlideIds(doc)[0];
    const credit = {
      provider: "pexels" as const,
      photographerName: "Grace Hopper",
      photographerUrl: "https://www.pexels.com/@grace",
      sourceUrl: "https://www.pexels.com/photo/123",
    };

    placeImageAsset({
      doc,
      slideId,
      asset: { id: "asset-small", width: 320, height: 180 },
      credit,
      selectOnly: vi.fn(),
      undoManager: { stopCapturing: vi.fn() },
    });

    expect(getSlideData(doc, slideId)?.elements[0]).toMatchObject({
      width: 320,
      height: 180,
      credit,
    });
  });
});
