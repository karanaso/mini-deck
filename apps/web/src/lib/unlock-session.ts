import type { Role } from "@mini-deck/deck";

export interface StoredUnlockSession {
  deckId: string;
  role: Role;
  token: string;
  expiresAt: number;
}

export const UNLOCK_STORAGE_PREFIX = "mini-deck:unlock:";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(deckId: string): string {
  return `${UNLOCK_STORAGE_PREFIX}${deckId}`;
}

function isStoredUnlock(value: unknown): value is StoredUnlockSession {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.deckId === "string" &&
    entry.deckId.length > 0 &&
    (entry.role === "editor" || entry.role === "viewer") &&
    typeof entry.token === "string" &&
    entry.token.length > 0 &&
    typeof entry.expiresAt === "number" &&
    Number.isFinite(entry.expiresAt)
  );
}

export function readUnlockSession(
  deckId: string,
  storage?: StorageLike,
  now = Date.now(),
): StoredUnlockSession | null {
  const target = getStorage(storage);
  if (!target) return null;
  try {
    const raw = target.getItem(storageKey(deckId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredUnlock(parsed) || parsed.deckId !== deckId || parsed.expiresAt <= now) {
      target.removeItem(storageKey(deckId));
      return null;
    }
    return parsed;
  } catch {
    target.removeItem(storageKey(deckId));
    return null;
  }
}

export function storeUnlockSession(
  session: StoredUnlockSession,
  storage?: StorageLike,
): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.setItem(storageKey(session.deckId), JSON.stringify(session));
  } catch {
    // Storage may be unavailable; the in-memory session still works for this tab.
  }
}

export function clearUnlockSession(deckId: string, storage?: StorageLike): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.removeItem(storageKey(deckId));
  } catch {
    // Ignore storage failures.
  }
}
