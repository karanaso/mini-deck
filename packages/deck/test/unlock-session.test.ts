import { describe, expect, it } from "vitest";

import {
  DEV_UNLOCK_SESSION_SECRET,
  UNLOCK_SESSION_DURATION_MS,
  createUnlockSessionToken,
  resolveUnlockSessionSecret,
  verifyUnlockSessionToken,
  type UnlockSessionPayload,
} from "../src/index.js";

const SECRET = "test-unlock-session-secret-with-32-chars";
const payload: UnlockSessionPayload = {
  deckId: "deck-1",
  role: "editor",
  pinVersion: 1,
  exp: Date.now() + UNLOCK_SESSION_DURATION_MS,
};

describe("unlock session tokens", () => {
  it("round-trips and preserves the payload", async () => {
    const token = await createUnlockSessionToken(payload, SECRET);
    expect(await verifyUnlockSessionToken(token, SECRET)).toEqual(payload);
  });

  it("rejects expiry, tampering, and the wrong secret", async () => {
    const token = await createUnlockSessionToken(payload, SECRET);
    expect(
      await verifyUnlockSessionToken(token, SECRET, payload.exp + 1),
    ).toBeNull();
    expect(
      await verifyUnlockSessionToken(`${token.slice(0, -1)}x`, SECRET),
    ).toBeNull();
    expect(
      await verifyUnlockSessionToken(token, "another-secret-with-32-characters"),
    ).toBeNull();
    expect(await verifyUnlockSessionToken("garbage", SECRET)).toBeNull();
  });

  it("keeps deck, role, and version in the signed payload", async () => {
    const token = await createUnlockSessionToken(
      {
        ...payload,
        deckId: "deck-2",
        role: "viewer",
        pinVersion: 3,
      },
      SECRET,
    );
    expect(await verifyUnlockSessionToken(token, SECRET)).toMatchObject({
      deckId: "deck-2",
      role: "viewer",
      pinVersion: 3,
    });
  });

  it("uses a development fallback but requires a strong production secret", () => {
    expect(resolveUnlockSessionSecret("", "development")).toBe(
      DEV_UNLOCK_SESSION_SECRET,
    );
    expect(resolveUnlockSessionSecret("short", "test")).toBe(
      DEV_UNLOCK_SESSION_SECRET,
    );
    expect(resolveUnlockSessionSecret(SECRET, "test")).toBe(SECRET);
    expect(() => resolveUnlockSessionSecret("", "production")).toThrow(
      /DECK_SESSION_SECRET/u,
    );
    expect(() => resolveUnlockSessionSecret("short", "production")).toThrow(
      /DECK_SESSION_SECRET/u,
    );
    expect(resolveUnlockSessionSecret(SECRET, "production")).toBe(SECRET);
  });
});
