import { describe, expect, it } from "vitest";

import { resolveLocale } from "@/lib/i18n/server";

describe("server locale resolution", () => {
  it("uses a valid cookie before the Accept-Language header", () => {
    expect(resolveLocale("en", "el-GR")).toBe("en");
    expect(resolveLocale("el", "en-US")).toBe("el");
  });

  it("falls back to the browser header for invalid or missing cookies", () => {
    expect(resolveLocale("fr", "el-GR,el;q=0.9")).toBe("el");
    expect(resolveLocale(undefined, "el-GR")).toBe("el");
    expect(resolveLocale(null, "en-US")).toBe("en");
    expect(resolveLocale(undefined, null)).toBe("en");
  });
});
