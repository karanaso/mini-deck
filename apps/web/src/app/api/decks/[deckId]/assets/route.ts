import { MAX_IMAGE_BYTES } from "@mini-deck/deck";

import { apiError, getBearerToken, getClientIp, jsonResponse } from "@/server/api";
import { authorizeDeck } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import {
  ImageValidationError,
  persistDeckImage,
  processDeckImage,
} from "@/server/images";
import { getAuthFailureLimiter } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  let image;
  try {
    image = await processDeckImage(
      new Uint8Array(await file.arrayBuffer()),
      file.type,
      maxBytes,
    );
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return apiError(
        error.code === "image_too_large" ? 413 : 415,
        error.code,
        error.message,
        { ...(error.details ? { details: error.details } : {}) },
      );
    }
    throw error;
  }

  const asset = await persistDeckImage(deckId, image);
  return jsonResponse({ asset }, { status: 201 });
}
