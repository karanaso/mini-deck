import { createElementId } from "@mini-deck/deck";

export const OWNER_ID_STORAGE_KEY = "mini-deck:owner-id";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeOwnerId(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return null;
  return trimmed;
}

export function readOwnerId(storage?: StorageLike): string | null {
  const target = getStorage(storage);
  if (!target) return null;
  try {
    return normalizeOwnerId(target.getItem(OWNER_ID_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getOrCreateOwnerId(storage?: StorageLike): string | null {
  const target = getStorage(storage);
  if (!target) return null;
  const existing = readOwnerId(target);
  if (existing) return existing;
  try {
    const created = createElementId();
    target.setItem(OWNER_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}
