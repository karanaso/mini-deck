import type { Locale } from "@/lib/i18n/config";
import { formatRelativeTime } from "@/lib/i18n/format";

export interface RecentDeck {
  deckId: string;
  editToken: string;
  title: string;
  lastOpenedAt: number;
}

export const RECENTS_STORAGE_KEY = "mini-deck:recent-decks";
const MAX_RECENTS = 20;

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

function isRecentDeck(value: unknown): value is RecentDeck {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.deckId === "string" &&
    entry.deckId.length > 0 &&
    typeof entry.editToken === "string" &&
    entry.editToken.length > 0 &&
    typeof entry.title === "string" &&
    typeof entry.lastOpenedAt === "number" &&
    Number.isFinite(entry.lastOpenedAt)
  );
}

export function readRecents(storage?: StorageLike): RecentDeck[] {
  const target = getStorage(storage);
  if (!target) return [];
  try {
    const raw = target.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      target.removeItem(RECENTS_STORAGE_KEY);
      return [];
    }
    const seen = new Set<string>();
    return parsed
      .filter(isRecentDeck)
      .filter((entry) => {
        if (seen.has(entry.deckId)) return false;
        seen.add(entry.deckId);
        return true;
      })
      .sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
      .slice(0, MAX_RECENTS);
  } catch {
    try {
      target.removeItem(RECENTS_STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode); the list is optional.
    }
    return [];
  }
}

function writeRecents(entries: RecentDeck[], storage?: StorageLike): RecentDeck[] {
  const target = getStorage(storage);
  const next = entries
    .sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
    .slice(0, MAX_RECENTS);
  if (target) {
    try {
      target.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Quota or privacy mode; keep the in-memory result.
    }
  }
  return next;
}

export function addRecent(deck: RecentDeck, storage?: StorageLike): RecentDeck[] {
  const entries = readRecents(storage).filter((entry) => entry.deckId !== deck.deckId);
  return writeRecents([deck, ...entries], storage);
}

export function updateRecentTitle(
  deckId: string,
  title: string,
  storage?: StorageLike,
): RecentDeck[] {
  const entries = readRecents(storage).map((entry) =>
    entry.deckId === deckId ? { ...entry, title } : entry,
  );
  return writeRecents(entries, storage);
}

export function touchRecent(
  deckId: string,
  lastOpenedAt = Date.now(),
  storage?: StorageLike,
): RecentDeck[] {
  const entries = readRecents(storage).map((entry) =>
    entry.deckId === deckId ? { ...entry, lastOpenedAt } : entry,
  );
  return writeRecents(entries, storage);
}

export function removeRecent(deckId: string, storage?: StorageLike): RecentDeck[] {
  return writeRecents(
    readRecents(storage).filter((entry) => entry.deckId !== deckId),
    storage,
  );
}

export function formatLastOpened(
  timestamp: number,
  locale: Locale = "en",
  now = Date.now(),
): string {
  return formatRelativeTime(timestamp, locale, now);
}
