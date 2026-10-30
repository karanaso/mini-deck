import {
  apiError,
  getBearerToken,
  getClientIp,
  jsonResponse,
} from "@/server/api";
import { pinBodySchema } from "@/server/access-validation";
import {
  getDeckSessionSecret,
  issueDeckSession,
  resolveDeckLink,
  verifyDeckPin,
} from "@/server/auth";
import {
  getAuthFailureLimiter,
  getPinAttemptLimiter,
  getPinDeckAttemptLimiter,
} from "@/server/rate-limit";

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

  if (!access.requiresPin) {
    return apiError(400, "pin_not_required", "This deck does not require a PIN");
  }

  const ip = getClientIp(request);
  const ipLimit = getPinAttemptLimiter().take(ip);
  const deckLimit = getPinDeckAttemptLimiter().take(deckId);
  const retryAfterMs = Math.max(ipLimit.retryAfterMs, deckLimit.retryAfterMs);
  if (!ipLimit.allowed || !deckLimit.allowed) {
    return apiError(429, "rate_limited", "Too many PIN attempts. Try again shortly.", {
      headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) },
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_request", "Expected a JSON request body");
  }
  const parsed = pinBodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(400, "invalid_request", "Enter a six-digit PIN");
  }

  if (!(await verifyDeckPin(deckId, access.role, parsed.data.pin))) {
    return apiError(401, "invalid_pin", "That PIN is not valid");
  }

  try {
    getDeckSessionSecret();
    const session = await issueDeckSession(deckId, access.role);
    return jsonResponse({
      deckId,
      role: access.role,
      title: access.title,
      protected: true,
      ...session,
    });
  } catch {
    return apiError(
      503,
      "access_not_configured",
      "Deck access is not configured. Set DECK_SESSION_SECRET on the server.",
    );
  }
}
