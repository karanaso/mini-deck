import { RateLimiter } from "@mini-deck/deck";

import { getServerEnv } from "./env";

let deckCreateLimiter: RateLimiter | null = null;
let authFailureLimiter: RateLimiter | null = null;
let imageSearchLimiter: RateLimiter | null = null;
let imageImportLimiter: RateLimiter | null = null;
let pinAttemptLimiter: RateLimiter | null = null;
let pinDeckAttemptLimiter: RateLimiter | null = null;
let joinLookupLimiter: RateLimiter | null = null;
let joinCodeAttemptLimiter: RateLimiter | null = null;

function createLimiters(): void {
  if (
    deckCreateLimiter &&
    authFailureLimiter &&
    imageSearchLimiter &&
    imageImportLimiter &&
    pinAttemptLimiter &&
    pinDeckAttemptLimiter &&
    joinLookupLimiter &&
    joinCodeAttemptLimiter
  ) {
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
  pinAttemptLimiter = new RateLimiter({
    capacity: env.PIN_ATTEMPT_RATE_LIMIT,
    refillPerSecond: env.PIN_ATTEMPT_RATE_LIMIT / (15 * 60),
  });
  pinDeckAttemptLimiter = new RateLimiter({
    capacity: env.PIN_DECK_ATTEMPT_RATE_LIMIT,
    refillPerSecond: env.PIN_DECK_ATTEMPT_RATE_LIMIT / (15 * 60),
  });
  joinLookupLimiter = new RateLimiter({
    capacity: env.JOIN_LOOKUP_RATE_LIMIT,
    refillPerSecond: env.JOIN_LOOKUP_RATE_LIMIT / (15 * 60),
  });
  joinCodeAttemptLimiter = new RateLimiter({
    capacity: env.JOIN_CODE_ATTEMPT_RATE_LIMIT,
    refillPerSecond: env.JOIN_CODE_ATTEMPT_RATE_LIMIT / (15 * 60),
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

export function getPinAttemptLimiter(): RateLimiter {
  createLimiters();
  return pinAttemptLimiter as RateLimiter;
}

export function getPinDeckAttemptLimiter(): RateLimiter {
  createLimiters();
  return pinDeckAttemptLimiter as RateLimiter;
}

export function getJoinLookupLimiter(): RateLimiter {
  createLimiters();
  return joinLookupLimiter as RateLimiter;
}

export function getJoinCodeAttemptLimiter(): RateLimiter {
  createLimiters();
  return joinCodeAttemptLimiter as RateLimiter;
}

export function resetRateLimitersForTests(): void {
  deckCreateLimiter?.reset();
  authFailureLimiter?.reset();
  imageSearchLimiter?.reset();
  imageImportLimiter?.reset();
  pinAttemptLimiter?.reset();
  pinDeckAttemptLimiter?.reset();
  joinLookupLimiter?.reset();
  joinCodeAttemptLimiter?.reset();
  deckCreateLimiter = null;
  authFailureLimiter = null;
  imageSearchLimiter = null;
  imageImportLimiter = null;
  pinAttemptLimiter = null;
  pinDeckAttemptLimiter = null;
  joinLookupLimiter = null;
  joinCodeAttemptLimiter = null;
}
