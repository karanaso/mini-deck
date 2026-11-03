import { afterEach, describe, expect, it } from "vitest";

import { getServerEnv, resetServerEnvForTests } from "@/server/env";

const rateLimitKeys = [
  "PIN_ATTEMPT_RATE_LIMIT",
  "PIN_DECK_ATTEMPT_RATE_LIMIT",
  "JOIN_LOOKUP_RATE_LIMIT",
  "JOIN_CODE_ATTEMPT_RATE_LIMIT",
] as const;

const originalEnv = new Map(
  rateLimitKeys.map((key) => [key, process.env[key]] as const),
);

function clearRateLimitEnv(): void {
  for (const key of rateLimitKeys) {
    delete process.env[key];
  }
  resetServerEnvForTests();
}

afterEach(() => {
  for (const key of rateLimitKeys) {
    const value = originalEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  resetServerEnvForTests();
});

describe("server environment rate limits", () => {
  it("defaults every join and PIN limiter to 1000", () => {
    clearRateLimitEnv();

    const env = getServerEnv();

    expect(env.PIN_ATTEMPT_RATE_LIMIT).toBe(1000);
    expect(env.PIN_DECK_ATTEMPT_RATE_LIMIT).toBe(1000);
    expect(env.JOIN_LOOKUP_RATE_LIMIT).toBe(1000);
    expect(env.JOIN_CODE_ATTEMPT_RATE_LIMIT).toBe(1000);
  });

  it("keeps explicit overrides", () => {
    clearRateLimitEnv();
    process.env.PIN_ATTEMPT_RATE_LIMIT = "25";
    resetServerEnvForTests();

    const env = getServerEnv();

    expect(env.PIN_ATTEMPT_RATE_LIMIT).toBe(25);
    expect(env.PIN_DECK_ATTEMPT_RATE_LIMIT).toBe(1000);
  });
});
