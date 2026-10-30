import { MAX_IMAGE_BYTES } from "@mini-deck/deck";

import {
  apiError,
  getBearerToken,
  getClientIp,
  jsonResponse,
} from "@/server/api";
import { authorizeDeck } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import {
  ImageValidationError,
  persistDeckImage,
  processDeckImage,
} from "@/server/images";
import { getAuthFailureLimiter, getImageImportLimiter } from "@/server/rate-limit";
import {
  getEnabledStockProvider,
  getStockProviderKey,
} from "@/server/stock-images";
import { downloadStockImage } from "@/server/stock-images/download";
import { stockProviderErrorResponse } from "@/server/stock-images/errors";
import { stockImportBodySchema } from "@/server/stock-images/validation";

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

  const rate = getImageImportLimiter().take(getClientIp(request));
  if (!rate.allowed) {
    return apiError(429, "rate_limited", "Too many image imports. Try again shortly.", {
      headers: { "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000))) },
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_request", "Expected a JSON request body");
  }

  const parsed = stockImportBodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      400,
      "invalid_request",
      "Choose a provider and a provider photo identifier.",
    );
  }

  const provider = getEnabledStockProvider(parsed.data.provider);
  if (!provider) {
    return apiError(
      400,
      "provider_not_configured",
      "That image provider is not configured",
    );
  }

  const env = getServerEnv();
  const maxBytes = Math.min(MAX_IMAGE_BYTES, env.MAX_IMAGE_BYTES);
  const apiKey = getStockProviderKey(provider.id);

  try {
    const source = await provider.resolve(parsed.data.photoId, apiKey);
    const downloaded = await downloadStockImage(
      source.downloadUrl,
      provider.imageHosts,
      maxBytes,
    );
    const processed = await processDeckImage(
      downloaded.bytes,
      downloaded.mimeType,
      maxBytes,
    );
    const asset = await persistDeckImage(deckId, processed);

    if (provider.trackDownload) {
      await provider.trackDownload(parsed.data.photoId, apiKey).catch(() => undefined);
    }

    return jsonResponse(
      {
        asset,
        credit: {
          provider: source.provider,
          photographerName: source.photographerName,
          photographerUrl: source.photographerUrl,
          sourceUrl: source.sourceUrl,
        },
      },
      { status: 201 },
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
    const mapped = stockProviderErrorResponse(error);
    return apiError(mapped.status, mapped.code, mapped.message);
  }
}
