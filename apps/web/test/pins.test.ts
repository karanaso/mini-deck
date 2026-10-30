import { describe, expect, it } from "vitest";

import {
  generateDeckPins,
  generateSixDigitPin,
  hashPin,
  isSixDigitPin,
  verifyPin,
} from "@/server/pins";

describe("PIN helpers", () => {
  it("generates six-digit PINs, including values that need padding", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateSixDigitPin()).toMatch(/^\d{6}$/u);
    }
    expect(isSixDigitPin("004271")).toBe(true);
    expect(isSixDigitPin("4271")).toBe(false);
    expect(isSixDigitPin("abcdef")).toBe(false);
  });

  it("generates distinct edit and view PINs", () => {
    for (let index = 0; index < 20; index += 1) {
      const pins = generateDeckPins();
      expect(pins.editPin).not.toBe(pins.viewPin);
      expect(pins.editPin).toMatch(/^\d{6}$/u);
      expect(pins.viewPin).toMatch(/^\d{6}$/u);
    }
  });

  it("hashes and verifies a PIN with a salted scrypt value", async () => {
    const pin = "004271";
    const hash = await hashPin(pin);
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$[^$]+\$[^$]+$/u);
    expect(await verifyPin(pin, hash)).toBe(true);
    expect(await verifyPin("004272", hash)).toBe(false);
    expect(await verifyPin(pin, null)).toBe(false);
    expect(await verifyPin(pin, "not-a-hash")).toBe(false);
    expect(await verifyPin(pin, "scrypt$x$8$1$abc$def")).toBe(false);
  });

  it("uses a fresh salt for each hash", async () => {
    const first = await hashPin("123456");
    const second = await hashPin("123456");
    expect(first).not.toBe(second);
    expect(await verifyPin("123456", first)).toBe(true);
    expect(await verifyPin("123456", second)).toBe(true);
  });
});
