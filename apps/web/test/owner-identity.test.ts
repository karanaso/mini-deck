import { describe, expect, it } from "vitest";

import {
  getOrCreateOwnerId,
  OWNER_ID_STORAGE_KEY,
  readOwnerId,
} from "@/lib/owner-identity";

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function unavailableStorage(): MemoryStorage {
  return {
    getItem(): string | null {
      throw new Error("storage unavailable");
    },
    setItem(): void {
      throw new Error("storage unavailable");
    },
  } as unknown as MemoryStorage;
}

describe("owner identity", () => {
  it("returns an existing stored owner id", () => {
    const storage = new MemoryStorage();
    storage.setItem(OWNER_ID_STORAGE_KEY, "owner-123");
    expect(readOwnerId(storage)).toBe("owner-123");
    expect(getOrCreateOwnerId(storage)).toBe("owner-123");
  });

  it("creates and persists an owner id when none exists", () => {
    const storage = new MemoryStorage();
    const created = getOrCreateOwnerId(storage);

    expect(created).toBeTruthy();
    expect(storage.getItem(OWNER_ID_STORAGE_KEY)).toBe(created);
    expect(getOrCreateOwnerId(storage)).toBe(created);
  });

  it("returns null when storage is unavailable", () => {
    expect(readOwnerId(unavailableStorage())).toBeNull();
    expect(getOrCreateOwnerId(unavailableStorage())).toBeNull();
  });

  it("returns null during server rendering", () => {
    expect(readOwnerId()).toBeNull();
    expect(getOrCreateOwnerId()).toBeNull();
  });
});
