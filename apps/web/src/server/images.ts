import sharp from "sharp";

import { deckAssets, getDatabase } from "@mini-deck/db";
import { MAX_IMAGE_DIMENSION, createAssetId } from "@mini-deck/deck";

import { getAssetStorage } from "./storage";

export const SUPPORTED_IMAGE_TYPES = new Map([
  ["image/png", { extension: "png", format: "png" as const }],
  ["image/jpeg", { extension: "jpg", format: "jpeg" as const }],
  ["image/webp", { extension: "webp", format: "webp" as const }],
]);

export type ImageValidationCode =
  | "image_too_large"
  | "unsupported_image"
  | "invalid_image";

export class ImageValidationError extends Error {
  readonly code: ImageValidationCode;
  readonly details?: { maxMb: number };

  constructor(
    code: ImageValidationCode,
    message: string,
    details?: { maxMb: number },
  ) {
    super(message);
    this.name = "ImageValidationError";
    this.code = code;
    this.details = details;
  }
}

export interface ProcessedImage {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
}

export interface StoredImageAsset {
  id: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
}

export async function processDeckImage(
  input: Uint8Array,
  declaredMimeType: string,
  maxBytes: number,
): Promise<ProcessedImage> {
  if (input.byteLength > maxBytes) {
    const maxMb = Math.floor(maxBytes / (1024 * 1024));
    throw new ImageValidationError(
      "image_too_large",
      `Images must be ${maxMb} MB or smaller`,
      { maxMb },
    );
  }

  const type = SUPPORTED_IMAGE_TYPES.get(declaredMimeType);
  if (!type) {
    throw new ImageValidationError(
      "unsupported_image",
      "Use a PNG, JPEG, or WebP image",
    );
  }

  let output: Buffer;
  let width: number;
  let height: number;
  try {
    const pipeline = sharp(input, {
      limitInputPixels: MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION,
      failOn: "error",
    })
      .rotate()
      .resize({
        width: 2560,
        height: 2560,
        fit: "inside",
        withoutEnlargement: true,
      });

    if (type.format === "jpeg") pipeline.jpeg({ quality: 90, mozjpeg: true });
    else if (type.format === "png") pipeline.png();
    else pipeline.webp({ quality: 90 });

    const result = await pipeline.toBuffer({ resolveWithObject: true });
    output = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    throw new ImageValidationError(
      "invalid_image",
      "The image could not be processed",
    );
  }

  return {
    bytes: new Uint8Array(output),
    mimeType: declaredMimeType,
    extension: type.extension,
    width,
    height,
  };
}

export async function persistDeckImage(
  deckId: string,
  image: ProcessedImage,
): Promise<StoredImageAsset> {
  const assetId = createAssetId();
  const objectKey = `decks/${deckId}/${assetId}.${image.extension}`;
  await getAssetStorage().put(objectKey, image.bytes, image.mimeType);

  const { db } = getDatabase();
  await db.insert(deckAssets).values({
    id: assetId,
    deckId,
    objectKey,
    mimeType: image.mimeType,
    byteSize: image.bytes.byteLength,
    width: image.width,
    height: image.height,
    createdAt: new Date(),
  });

  return {
    id: assetId,
    url: `/api/assets/${assetId}`,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
  };
}
