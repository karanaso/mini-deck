import { RateLimiter } from "@mini-deck/deck";

import { getServerEnv } from "./env";

let deckCreateLimiter: RateLimiter | null = null;
let authFailureLimiter: RateLimiter | null = null;
let imageSearchLimiter: RateLimiter | null = null;
let imageImportLimiter: RateLimiter | null = null;

function createLimiters(): void {
  if (deckCreateLimiter && authFailureLimiter && imageSearchLimiter && imageImportLimiter) {
    return;
  }
  const env = getServerEnv();
  deckCreateLimiter = new RateLimiter({
    capacity: env.DECK_CREATE_RATE_LIMIT,
    refillPerSecond: env.DECK_CREATE_RATE_LIMIT / 60,
  });
  authFailureLimiter = new RateLimiter({
    capacity: env.AUTH_FAILURE_RATE_LIMIT,
    refillPerSecond: env.AUTH_FAILURE_RATE_LIMIT / 60,
  });
  imageSearchLimiter = new RateLimiter({
    capacity: env.IMAGE_SEARCH_RATE_LIMIT,
    refillPerSecond: env.IMAGE_SEARCH_RATE_LIMIT / 60,
  });
  imageImportLimiter = new RateLimiter({
    capacity: env.IMAGE_IMPORT_RATE_LIMIT,
    refillPerSecond: env.IMAGE_IMPORT_RATE_LIMIT / 60,
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

export function getImageSearchLimiter(): RateLimiter {
  createLimiters();
  return imageSearchLimiter as RateLimiter;
}

export function getImageImportLimiter(): RateLimiter {
  createLimiters();
  return imageImportLimiter as RateLimiter;
}

export function resetRateLimitersForTests(): void {
  deckCreateLimiter?.reset();
  authFailureLimiter?.reset();
  imageSearchLimiter?.reset();
  imageImportLimiter?.reset();
  deckCreateLimiter = null;
  authFailureLimiter = null;
  imageSearchLimiter = null;
  imageImportLimiter = null;
}
