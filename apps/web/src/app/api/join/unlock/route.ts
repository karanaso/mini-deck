import { apiError, getClientIp, jsonResponse } from "@/server/api";
import { joinUnlockBodySchema } from "@/server/access-validation";
import {
  findDeckByJoinCode,
  getDeckSessionSecret,
  issueDeckSession,
  verifyDeckPin,
} from "@/server/auth";
import {
  getJoinCodeAttemptLimiter,
  getJoinLookupLimiter,
  getPinAttemptLimiter,
  getPinDeckAttemptLimiter,
} from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const ipLimit = getJoinLookupLimiter().take(ip);
  if (!ipLimit.allowed) {
    return apiError(429, "rate_limited", "Too many code attempts. Try again shortly.", {
      headers: { "Retry-After": String(Math.max(1, Math.ceil(ipLimit.retryAfterMs / 1000))) },
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_request", "Expected a JSON request body");
  }
  const parsed = joinUnlockBodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(
      400,
      "invalid_request",
      "Enter a seven-digit code, a role, and a six-digit PIN",
    );
  }

  const codeLimit = getJoinCodeAttemptLimiter().take(parsed.data.code);
  if (!codeLimit.allowed) {
    return apiError(429, "rate_limited", "Too many code attempts. Try again shortly.", {
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil(codeLimit.retryAfterMs / 1000))),
      },
    });
  }

  const deck = await findDeckByJoinCode(parsed.data.code);
  if (!deck || !deck.editPinHash || !deck.viewPinHash) {
    return apiError(404, "not_found", "Deck not found");
  }

  const pinLimit = getPinAttemptLimiter().take(ip);
  const deckLimit = getPinDeckAttemptLimiter().take(deck.id);
  const retryAfterMs = Math.max(pinLimit.retryAfterMs, deckLimit.retryAfterMs);
  if (!pinLimit.allowed || !deckLimit.allowed) {
    return apiError(429, "rate_limited", "Too many PIN attempts. Try again shortly.", {
      headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) },
    });
  }

  if (!(await verifyDeckPin(deck.id, parsed.data.role, parsed.data.pin))) {
    return apiError(401, "invalid_pin", "That PIN is not valid");
  }

  try {
    getDeckSessionSecret();
    const session = await issueDeckSession(deck.id, parsed.data.role);
    return jsonResponse({
      deckId: deck.id,
      title: deck.title,
      role: parsed.data.role,
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
