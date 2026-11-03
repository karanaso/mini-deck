import { describe, expect, it } from "vitest";

import { RateLimiter } from "../src/index.js";

describe("rate limiter", () => {
  it("refills tokens over time and rejects when exhausted", () => {
    let now = 0;
    const limiter = new RateLimiter({
      capacity: 2,
      refillPerSecond: 1,
      now: () => now,
    });

    expect(limiter.take("ip").allowed).toBe(true);
    expect(limiter.take("ip").allowed).toBe(true);
    const rejected = limiter.take("ip");
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterMs).toBe(1000);

    now = 1000;
    expect(limiter.take("ip").allowed).toBe(true);
    expect(limiter.take("ip").allowed).toBe(false);
  });

  it("accepts 1000 attempts and refills within a minute", () => {
    let now = 0;
    const limiter = new RateLimiter({
      capacity: 1000,
      refillPerSecond: 1000 / 60,
      now: () => now,
    });

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      expect(limiter.take("ip").allowed).toBe(true);
    }

    const rejected = limiter.take("ip");
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterMs).toBeGreaterThan(0);

    now = 60_000;

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      expect(limiter.take("ip").allowed).toBe(true);
    }

    expect(limiter.take("ip").allowed).toBe(false);
  });

  it("keeps keys independent and supports reset", () => {
    const now = 0;
    const limiter = new RateLimiter({
      capacity: 1,
      refillPerSecond: 1,
      now: () => now,
    });
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
    expect(limiter.take("b").allowed).toBe(true);
    limiter.reset("a");
    expect(limiter.take("a").allowed).toBe(true);
  });
});
