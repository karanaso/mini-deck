import sharp from "sharp";

import { deckAssets, getDatabase } from "@mini-deck/db";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  createAssetId,
} from "@mini-deck/deck";

import { apiError, getBearerToken, getClientIp, jsonResponse } from "@/server/api";
import { authorizeDeck } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { getAuthFailureLimiter } from "@/server/rate-limit";
import { getAssetStorage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_TYPES = new Map([
  ["image/png", { extension: "png", format: "png" as const }],
  ["image/jpeg", { extension: "jpg", format: "jpeg" as const }],
  ["image/webp", { extension: "webp", format: "webp" as const }],
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
): Promise<Response> {
  const { deckId } = await context.params;
  const token = getBearerToken(request);
  const access = await authorizeDeck(deckId, token);
  if (!access) {
    const limit = getAuthFailureLimiter().take(getClientIp(request));
    if (!limit.allowed) {
      return apiError(429, "rate_limited", "Too many attempts. Try again shortly.");
    }
    return apiError(404, "not_found", "Deck not found");
  }
  if (access.role !== "editor") {
    return apiError(403, "read_only", "This deck is read-only");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "invalid_form", "Expected multipart form data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError(400, "missing_file", "Choose an image to upload");
  }

  const env = getServerEnv();
  const maxBytes = Math.min(MAX_IMAGE_BYTES, env.MAX_IMAGE_BYTES);
  if (file.size > maxBytes) {
    const maxMb = Math.floor(maxBytes / (1024 * 1024));
    return apiError(
      413,
      "image_too_large",
      `Images must be ${maxMb} MB or smaller`,
      { details: { maxMb } },
    );
  }

  const type = SUPPORTED_TYPES.get(file.type);
  if (!type) {
    return apiError(415, "unsupported_image", "Use a PNG, JPEG, or WebP image");
  }

  const input = new Uint8Array(await file.arrayBuffer());
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
    return apiError(415, "invalid_image", "The image could not be processed");
  }

  const assetId = createAssetId();
  const objectKey = `decks/${deckId}/${assetId}.${type.extension}`;
  const mimeType = file.type;
  const storage = getAssetStorage();
  await storage.put(objectKey, output, mimeType);

  const { db } = getDatabase();
  await db.insert(deckAssets).values({
    id: assetId,
    deckId,
    objectKey,
    mimeType,
    byteSize: output.byteLength,
    width,
    height,
    createdAt: new Date(),
  });

  return jsonResponse(
    {
      asset: {
        id: assetId,
        url: `/api/assets/${assetId}`,
        mimeType,
        width,
        height,
      },
    },
    { status: 201 },
  );
}
