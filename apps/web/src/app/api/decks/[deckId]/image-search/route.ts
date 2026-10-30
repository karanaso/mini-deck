import {
  apiError,
  getBearerToken,
  getClientIp,
  jsonResponse,
} from "@/server/api";
import { authorizeDeck } from "@/server/auth";
import { getAuthFailureLimiter, getImageSearchLimiter } from "@/server/rate-limit";
import {
  getCachedStockSearch,
  setCachedStockSearch,
  stockSearchCacheKey,
} from "@/server/stock-images/cache";
import { stockProviderErrorResponse } from "@/server/stock-images/errors";
import {
  getEnabledStockProvider,
  getStockProviderKey,
} from "@/server/stock-images";
import { stockSearchQuerySchema } from "@/server/stock-images/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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

  const ip = getClientIp(request);
  const rate = getImageSearchLimiter().take(ip);
  if (!rate.allowed) {
    return apiError(429, "rate_limited", "Too many image searches. Try again shortly.", {
      headers: { "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000))) },
    });
  }

  const url = new URL(request.url);
  const parsed = stockSearchQuerySchema.safeParse({
    provider: url.searchParams.get("provider") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    orientation: url.searchParams.get("orientation") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(
      400,
      "invalid_request",
      "Choose a provider, enter a search term, and use a valid page.",
    );
  }

  const input = parsed.data;
  const provider = getEnabledStockProvider(input.provider);
  if (!provider) {
    return apiError(
      400,
      "provider_not_configured",
      "That image provider is not configured",
    );
  }

  const cacheKey = stockSearchCacheKey(provider.id, {
    query: input.q,
    page: input.page,
    orientation: input.orientation,
  });
  const cached = getCachedStockSearch(cacheKey);
  if (cached) {
    return jsonResponse({
      provider: provider.id,
      query: input.q,
      orientation: input.orientation,
      ...cached,
    });
  }

  try {
    const page = await provider.search(
      {
        query: input.q,
        page: input.page,
        orientation: input.orientation,
      },
      getStockProviderKey(provider.id),
    );
    setCachedStockSearch(cacheKey, page);
    return jsonResponse({
      provider: provider.id,
      query: input.q,
      orientation: input.orientation,
      ...page,
    });
  } catch (error) {
    const mapped = stockProviderErrorResponse(error);
    return apiError(mapped.status, mapped.code, mapped.message);
  }
}
