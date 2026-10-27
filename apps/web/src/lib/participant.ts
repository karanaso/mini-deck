import {
  createParticipantIdentity,
  type ParticipantState,
} from "@mini-deck/deck";

const STORAGE_KEY = "mini-deck:participant";

export function readStoredParticipant(): ParticipantState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ParticipantState>;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.color === "string"
    ) {
      return { id: parsed.id, name: parsed.name, color: parsed.color };
    }
  } catch {
    // Session storage can be unavailable.
  }
  return null;
}

export function storeParticipant(participant: ParticipantState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(participant));
  } catch {
    // Session storage can be unavailable.
  }
}

export function resolveParticipant(
  existing: readonly ParticipantState[],
  stored: ParticipantState | null,
): ParticipantState {
  if (stored) {
    const collision = existing.some(
      (participant) =>
        participant.id !== stored.id &&
        (participant.name === stored.name || participant.color === stored.color),
    );
    if (!collision) return stored;
  }
  return createParticipantIdentity(existing);
}

export function initials(name: string): string {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
