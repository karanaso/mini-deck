export interface DeckAccessValues {
  deckId: string;
  joinCode: string;
  editPin: string | null;
  viewPin: string | null;
}

export const DECK_ACCESS_STORAGE_KEY = "mini-deck:deck-access";
const JOIN_CODE_PATTERN = /^\d{7}$/u;
const PIN_PATTERN = /^\d{6}$/u;

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

function isPin(value: unknown): value is string {
  return typeof value === "string" && PIN_PATTERN.test(value);
}

function isAccessValues(value: unknown): value is DeckAccessValues {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  const hasJoinCode =
    typeof entry.joinCode === "string" && JOIN_CODE_PATTERN.test(entry.joinCode);
  const bothOpen = entry.editPin === null && entry.viewPin === null;
  const bothProtected = isPin(entry.editPin) && isPin(entry.viewPin);
  return (
    typeof entry.deckId === "string" &&
    entry.deckId.length > 0 &&
    hasJoinCode &&
    (bothOpen || bothProtected)
  );
}

function readAll(storage?: StorageLike): DeckAccessValues[] {
  const target = getStorage(storage);
  if (!target) return [];
  try {
    const raw = target.getItem(DECK_ACCESS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAccessValues) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: DeckAccessValues[], storage?: StorageLike): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.setItem(DECK_ACCESS_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be unavailable; the creation dialog still shows the values.
  }
}

export function readDeckAccessValues(
  deckId: string,
  storage?: StorageLike,
): DeckAccessValues | null {
  return readAll(storage).find((entry) => entry.deckId === deckId) ?? null;
}

export function storeDeckAccessValues(
  values: DeckAccessValues,
  storage?: StorageLike,
): void {
  const entries = readAll(storage).filter((entry) => entry.deckId !== values.deckId);
  writeAll([values, ...entries], storage);
}

export function clearDeckAccessValues(
  deckId: string,
  storage?: StorageLike,
): void {
  writeAll(
    readAll(storage).filter((entry) => entry.deckId !== deckId),
    storage,
  );
}
