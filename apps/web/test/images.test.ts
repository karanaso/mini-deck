import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  ImageValidationError,
  processDeckImage,
} from "@/server/images";

async function pngBuffer(size = 32): Promise<Uint8Array> {
  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 240, g: 80, b: 40 },
    },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("processDeckImage", () => {
  it("processes a supported image and keeps its dimensions", async () => {
    const result = await processDeckImage(
      await pngBuffer(40),
      "image/png",
      10 * 1024 * 1024,
    );
    expect(result).toMatchObject({
      mimeType: "image/png",
      extension: "png",
      width: 40,
      height: 40,
    });
    expect(result.bytes.byteLength).toBeGreaterThan(0);
  });

  it("rejects oversized and unsupported inputs with specific codes", async () => {
    await expect(
      processDeckImage(await pngBuffer(), "image/png", 10),
    ).rejects.toMatchObject({
      code: "image_too_large",
      details: { maxMb: 0 },
    });

    await expect(
      processDeckImage(new Uint8Array([1, 2, 3]), "image/svg+xml", 1024),
    ).rejects.toBeInstanceOf(ImageValidationError);

    await expect(
      processDeckImage(new Uint8Array([1, 2, 3]), "image/png", 1024),
    ).rejects.toMatchObject({ code: "invalid_image" });
  });

  it("resizes images above the 2560 pixel bound", async () => {
    const result = await processDeckImage(
      await pngBuffer(3000),
      "image/png",
      20 * 1024 * 1024,
    );
    expect(result.width).toBe(2560);
    expect(result.height).toBe(2560);
  });
});
