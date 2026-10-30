import { describe, expect, it, vi } from "vitest";

import {
  generateSevenDigitJoinCode,
  generateUniqueJoinCode,
  isSevenDigitJoinCode,
} from "@/server/join-code";

describe("join-code helpers", () => {
  it("generates seven digits and accepts leading zeros", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateSevenDigitJoinCode()).toMatch(/^\d{7}$/u);
    }
    expect(isSevenDigitJoinCode("0042719")).toBe(true);
    expect(isSevenDigitJoinCode("42719")).toBe(false);
    expect(isSevenDigitJoinCode("00427190")).toBe(false);
  });

  it("retries when a generated code is taken", async () => {
    const isAvailable = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const code = await generateUniqueJoinCode(isAvailable);
    expect(code).toMatch(/^\d{7}$/u);
    expect(isAvailable).toHaveBeenCalledTimes(3);
  });

  it("fails after exhausting attempts", async () => {
    await expect(
      generateUniqueJoinCode(async () => false, 3),
    ).rejects.toThrow(/unique join code/u);
  });
});
