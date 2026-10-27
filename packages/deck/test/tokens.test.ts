import { describe, expect, it } from "vitest";

import {
  base64UrlToBytes,
  base64UrlToString,
  createDeckId,
  createParticipantIdentity,
  deriveViewToken,
  generateEditToken,
  hashToken,
  resolveRole,
  sanitizeAwarenessState,
  stringToBase64Url,
} from "../src/index.js";

describe("capability tokens", () => {
  it("generates random deck ids and edit tokens", async () => {
    const deckIds = new Set(Array.from({ length: 20 }, () => createDeckId()));
    const editTokens = new Set(
      await Promise.all(Array.from({ length: 20 }, () => generateEditToken())),
    );

    expect(deckIds.size).toBe(20);
    expect(editTokens.size).toBe(20);
    expect([...deckIds][0]).toHaveLength(21);
    expect([...editTokens][0]).toHaveLength(43);
  });

  it("derives a deterministic deck-bound view token", async () => {
    const editToken = await generateEditToken();
    const first = await deriveViewToken(editToken, "deck-one");
    const second = await deriveViewToken(editToken, "deck-one");
    const otherDeck = await deriveViewToken(editToken, "deck-two");

    expect(first).toBe(second);
    expect(first).not.toBe(otherDeck);
    expect(first).not.toBe(editToken);
  });

  it("hashes tokens and resolves edit before view", async () => {
    const editToken = await generateEditToken();
    const deckId = createDeckId();
    const viewToken = await deriveViewToken(editToken, deckId);
    const editHash = await hashToken(editToken);
    const viewHash = await hashToken(viewToken);

    expect(editHash).toHaveLength(64);
    expect(editHash).not.toBe(viewHash);
    expect(resolveRole(await hashToken(editToken), editHash, viewHash)).toBe("editor");
    expect(resolveRole(await hashToken(viewToken), editHash, viewHash)).toBe("viewer");
    expect(resolveRole(await hashToken("tampered"), editHash, viewHash)).toBeNull();
  });

  it("round-trips unicode strings through base64url", () => {
    const source = '{"text":"Héllo 世界 🚀"}';
    const encoded = stringToBase64Url(source);
    expect(encoded).not.toContain("=");
    expect(base64UrlToString(encoded)).toBe(source);
    expect(base64UrlToBytes(encoded)).toBeInstanceOf(Uint8Array);
  });
});

describe("participant identity", () => {
  it("avoids names and colors already in use", () => {
    const existing = [
      { id: "1", name: "Amber Fox", color: "#2563eb" },
      { id: "2", name: "Blue Otter", color: "#dc2626" },
    ];
    const participant = createParticipantIdentity(existing);
    expect(participant.name).not.toBe("Amber Fox");
    expect(participant.color).not.toBe("#2563eb");
    expect(participant.color).not.toBe("#dc2626");
  });
});

describe("awareness validation", () => {
  it("accepts a valid awareness state", () => {
    const state = sanitizeAwarenessState({
      user: { id: "u1", name: "Sam", color: "#2563eb" },
      cursor: { slideId: "s1", x: 10, y: 20 },
      selection: { slideId: "s1", ids: ["e1"] },
    });
    expect(state?.user.name).toBe("Sam");
    expect(state?.selection?.ids).toEqual(["e1"]);
  });

  it("rejects malformed awareness state", () => {
    expect(sanitizeAwarenessState({ user: { name: "" } })).toBeNull();
    expect(
      sanitizeAwarenessState({
        user: { id: "u1", name: "Sam", color: "#2563eb" },
        cursor: { slideId: "s1", x: Number.NaN, y: 0 },
        selection: null,
      }),
    ).toBeNull();
  });
});
