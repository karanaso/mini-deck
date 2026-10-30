import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-error";
import {
  clearDeckAccessValues,
  readDeckAccessValues,
  storeDeckAccessValues,
} from "@/lib/deck-access-values";
import {
  clearUnlockSession,
  readUnlockSession,
  storeUnlockSession,
} from "@/lib/unlock-session";
import {
  fetchDeckSession,
  lookupJoinCode,
  resetDeckAccess,
  unlockDeckWithPin,
  unlockJoinCode,
} from "@/lib/session";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local access values", () => {
  it("stores, reads, and clears values per deck", () => {
    const storage = new MemoryStorage();
    storeDeckAccessValues(
      {
        deckId: "deck-1",
        joinCode: "0042719",
        editPin: "004271",
        viewPin: "837204",
      },
      storage,
    );

    expect(readDeckAccessValues("deck-1", storage)).toEqual({
      deckId: "deck-1",
      joinCode: "0042719",
      editPin: "004271",
      viewPin: "837204",
    });
    expect(readDeckAccessValues("deck-2", storage)).toBeNull();

    clearDeckAccessValues("deck-1", storage);
    expect(readDeckAccessValues("deck-1", storage)).toBeNull();
  });

  it("ignores malformed stored values", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "mini-deck:deck-access",
      JSON.stringify([{ deckId: "deck-1", joinCode: "123" }]),
    );
    expect(readDeckAccessValues("deck-1", storage)).toBeNull();
  });
});

describe("unlock session storage", () => {
  it("stores a session and expires it at the stored time", () => {
    const storage = new MemoryStorage();
    const session = {
      deckId: "deck-1",
      role: "editor" as const,
      token: "v1.token",
      expiresAt: 2_000,
    };
    storeUnlockSession(session, storage);

    expect(readUnlockSession("deck-1", storage, 1_999)).toEqual(session);
    expect(readUnlockSession("deck-1", storage, 2_000)).toBeNull();
  });

  it("clears malformed or expired entries", () => {
    const storage = new MemoryStorage();
    storage.setItem("mini-deck:unlock:deck-1", "{broken");
    expect(readUnlockSession("deck-1", storage)).toBeNull();
    expect(storage.getItem("mini-deck:unlock:deck-1")).toBeNull();

    storeUnlockSession(
      {
        deckId: "deck-1",
        role: "viewer",
        token: "v1.token",
        expiresAt: 10,
      },
      storage,
    );
    clearUnlockSession("deck-1", storage);
    expect(readUnlockSession("deck-1", storage)).toBeNull();
  });
});

describe("deck access API helpers", () => {
  it("distinguishes ready, pin-required, and missing sessions", async () => {
    const ready = vi.fn(async () =>
      Response.json({ role: "editor", title: "Deck", protected: true }),
    );
    expect(await fetchDeckSession("deck-1", "token", ready)).toEqual({
      status: "ready",
      session: { role: "editor", title: "Deck", protected: true },
    });

    const pin = vi.fn(async () => Response.json({ requiresPin: true, role: "viewer" }));
    expect(await fetchDeckSession("deck-1", "token", pin)).toEqual({
      status: "pin_required",
      role: "viewer",
    });

    const missing = vi.fn(async () => new Response(null, { status: 404 }));
    expect(await fetchDeckSession("deck-1", "token", missing)).toEqual({
      status: "not_found",
    });
  });

  it("posts unlock, join, and reset requests with the right credentials", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/decks/deck-1/unlock") {
        expect(JSON.parse(String(init?.body))).toEqual({ pin: "004271" });
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer edit-token",
        );
        return Response.json({
          deckId: "deck-1",
          role: "editor",
          title: "Deck",
          protected: true,
          unlockToken: "v1.token",
          expiresAt: 10,
        });
      }
      if (url === "/api/join/lookup") {
        expect(JSON.parse(String(init?.body))).toEqual({ code: "0042719" });
        return Response.json({ deckId: "deck-1", title: "Deck" });
      }
      if (url === "/api/join/unlock") {
        expect(JSON.parse(String(init?.body))).toEqual({
          code: "0042719",
          role: "viewer",
          pin: "837204",
        });
        return Response.json({
          deckId: "deck-1",
          role: "viewer",
          title: "Deck",
          protected: true,
          unlockToken: "v1.view",
          expiresAt: 10,
        });
      }
      if (url === "/api/decks/deck-1/access/reset") {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer session-token",
        );
        return Response.json({
          deckId: "deck-1",
          role: "editor",
          title: "Deck",
          protected: true,
          joinCode: "7723104",
          editPin: "551028",
          viewPin: "309442",
          unlockToken: "v1.new",
          expiresAt: 20,
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(
      await unlockDeckWithPin("deck-1", "edit-token", "004271", fetchMock),
    ).toMatchObject({ role: "editor", unlockToken: "v1.token" });
    expect(await lookupJoinCode("0042719", fetchMock)).toEqual({
      deckId: "deck-1",
      title: "Deck",
    });
    expect(
      await unlockJoinCode("0042719", "viewer", "837204", fetchMock),
    ).toMatchObject({ role: "viewer", unlockToken: "v1.view" });
    expect(await resetDeckAccess("deck-1", "session-token", fetchMock)).toMatchObject({
      joinCode: "7723104",
      unlockToken: "v1.new",
    });
  });

  it("maps invalid PIN responses to an ApiError", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { error: { code: "invalid_pin", message: "That PIN is not valid" } },
        { status: 401 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const error = await unlockDeckWithPin("deck-1", "token", "000000", fetchMock).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("invalid_pin");
  });
});
