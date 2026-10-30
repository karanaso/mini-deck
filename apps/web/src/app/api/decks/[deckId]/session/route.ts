import { apiError, getBearerToken, getClientIp, jsonResponse } from "@/server/api";
import { resolveDeckLink } from "@/server/auth";
import { getAuthFailureLimiter } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ deckId: string }> },
): Promise<Response> {
  const { deckId } = await context.params;
  const token = getBearerToken(request);
  const access = await resolveDeckLink(deckId, token);

  if (!access) {
    const limit = getAuthFailureLimiter().take(getClientIp(request));
    if (!limit.allowed) {
      return apiError(429, "rate_limited", "Too many attempts. Try again shortly.", {
        headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
      });
    }
    return apiError(404, "not_found", "Deck not found");
  }

  if (access.requiresPin) {
    return jsonResponse({ requiresPin: true, role: access.role });
  }

  return jsonResponse({
    role: access.role,
    title: access.title,
    protected: access.protected,
  });
}
