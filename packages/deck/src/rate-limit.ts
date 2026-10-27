export interface RateLimitOptions {
  capacity: number;
  refillPerSecond: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export class RateLimiter {
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly now: () => number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(options: RateLimitOptions) {
    this.capacity = Math.max(1, options.capacity);
    this.refillPerSecond = Math.max(0, options.refillPerSecond);
    this.now = options.now ?? Date.now;
  }

  take(key: string, cost = 1): RateLimitResult {
    const now = this.now();
    const existing = this.buckets.get(key);
    const bucket = existing ?? { tokens: this.capacity, updatedAt: now };
    if (existing) {
      const elapsedSeconds = Math.max(0, now - existing.updatedAt) / 1000;
      bucket.tokens = Math.min(
        this.capacity,
        existing.tokens + elapsedSeconds * this.refillPerSecond,
      );
      bucket.updatedAt = now;
    }

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      this.buckets.set(key, bucket);
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: 0,
      };
    }

    this.buckets.set(key, bucket);
    const missing = cost - bucket.tokens;
    const retryAfterMs =
      this.refillPerSecond > 0
        ? Math.ceil((missing / this.refillPerSecond) * 1000)
        : 60_000;
    return {
      allowed: false,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs,
    };
  }

  reset(key?: string): void {
    if (key) this.buckets.delete(key);
    else this.buckets.clear();
  }
}
