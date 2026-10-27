import { RateLimiter } from "@mini-deck/deck";

import { getServerEnv } from "./env";

let deckCreateLimiter: RateLimiter | null = null;
let authFailureLimiter: RateLimiter | null = null;

function createLimiters(): void {
  if (deckCreateLimiter && authFailureLimiter) return;
  const env = getServerEnv();
  deckCreateLimiter = new RateLimiter({
    capacity: env.DECK_CREATE_RATE_LIMIT,
    refillPerSecond: env.DECK_CREATE_RATE_LIMIT / 60,
  });
  authFailureLimiter = new RateLimiter({
    capacity: env.AUTH_FAILURE_RATE_LIMIT,
    refillPerSecond: env.AUTH_FAILURE_RATE_LIMIT / 60,
  });
}

export function getDeckCreateLimiter(): RateLimiter {
  createLimiters();
  return deckCreateLimiter as RateLimiter;
}

export function getAuthFailureLimiter(): RateLimiter {
  createLimiters();
  return authFailureLimiter as RateLimiter;
}

export function resetRateLimitersForTests(): void {
  deckCreateLimiter?.reset();
  authFailureLimiter?.reset();
  deckCreateLimiter = null;
  authFailureLimiter = null;
}
