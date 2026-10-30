import { apiError, getClientIp, jsonResponse } from "@/server/api";
import { joinLookupBodySchema } from "@/server/access-validation";
import { findDeckByJoinCode } from "@/server/auth";
import {
  getJoinCodeAttemptLimiter,
  getJoinLookupLimiter,
} from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const ipLimit = getJoinLookupLimiter().take(ip);
  if (!ipLimit.allowed) {
    return apiError(429, "rate_limited", "Too many code lookups. Try again shortly.", {
      headers: { "Retry-After": String(Math.max(1, Math.ceil(ipLimit.retryAfterMs / 1000))) },
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_request", "Expected a JSON request body");
  }
  const parsed = joinLookupBodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(400, "invalid_request", "Enter a seven-digit join code");
  }

  const codeLimit = getJoinCodeAttemptLimiter().take(parsed.data.code);
  if (!codeLimit.allowed) {
    return apiError(429, "rate_limited", "Too many code lookups. Try again shortly.", {
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil(codeLimit.retryAfterMs / 1000))),
      },
    });
  }

  const deck = await findDeckByJoinCode(parsed.data.code);
  if (!deck || !deck.editPinHash || !deck.viewPinHash) {
    return apiError(404, "not_found", "Deck not found");
  }

  return jsonResponse({ deckId: deck.id, title: deck.title });
}
