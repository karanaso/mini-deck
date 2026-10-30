import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getProviders } from "@/app/api/image-search/providers/route";
import { resetServerEnvForTests } from "@/server/env";

const originalEnv = { ...process.env };

function configure(unsplash?: string, pexels?: string): void {
  if (unsplash === undefined) delete process.env.UNSPLASH_ACCESS_KEY;
  else process.env.UNSPLASH_ACCESS_KEY = unsplash;
  if (pexels === undefined) delete process.env.PEXELS_API_KEY;
  else process.env.PEXELS_API_KEY = pexels;
  resetServerEnvForTests();
}

beforeEach(() => {
  configure();
});

afterEach(() => {
  process.env = { ...originalEnv };
  resetServerEnvForTests();
});

describe("GET /api/image-search/providers", () => {
  it("returns an empty list when no provider is configured", async () => {
    const response = await getProviders();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ providers: [] });
    expect(response.headers.get("cache-control")).toContain("public");
  });

  it("returns only the configured provider", async () => {
    configure("unsplash-secret", "");
    const response = await getProviders();
    expect(await response.json()).toEqual({ providers: ["unsplash"] });
  });

  it("returns both providers without leaking keys", async () => {
    configure("unsplash-secret", "pexels-secret");
    const response = await getProviders();
    const body = await response.json();
    expect(body).toEqual({ providers: ["unsplash", "pexels"] });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("unsplash-secret");
    expect(serialized).not.toContain("pexels-secret");
  });
});
