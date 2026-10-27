import { nanoid } from "nanoid";

import { MAX_PARTICIPANT_NAME, MAX_SELECTION_IDS } from "./constants.js";
import {
  awarenessStateSchema,
  participantSchema,
  type AwarenessState,
  type ParticipantState,
  type Role,
} from "./types.js";

const encoder = new TextEncoder();

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function stringToBase64Url(value: string): string {
  return bytesToBase64Url(encoder.encode(value));
}

export function base64UrlToString(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

export function createDeckId(): string {
  return nanoid(21);
}

export function createElementId(): string {
  return nanoid(12);
}

export function createAssetId(): string {
  return nanoid(21);
}

export async function generateEditToken(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64Url(bytes);
}

export async function deriveViewToken(editToken: string, deckId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base64UrlToBytes(editToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`view:${deckId}`),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function resolveRole(
  tokenHash: string,
  editTokenHash: string,
  viewTokenHash: string,
): Role | null {
  if (constantTimeEqual(tokenHash, editTokenHash)) return "editor";
  if (constantTimeEqual(tokenHash, viewTokenHash)) return "viewer";
  return null;
}

export function createParticipantIdentity(
  existing: readonly ParticipantState[] = [],
): ParticipantState {
  const adjectives = [
    "Amber",
    "Blue",
    "Coral",
    "Golden",
    "Indigo",
    "Jade",
    "Lilac",
    "Mint",
    "Olive",
    "Peach",
    "Rose",
    "Silver",
    "Teal",
    "Violet",
  ];
  const animals = [
    "Fox",
    "Otter",
    "Heron",
    "Lynx",
    "Panda",
    "Quail",
    "Raven",
    "Seal",
    "Tiger",
    "Wren",
    "Yak",
    "Zebra",
  ];
  const colors = [
    "#2563eb",
    "#dc2626",
    "#059669",
    "#d97706",
    "#7c3aed",
    "#db2777",
    "#0891b2",
    "#4d7c0f",
    "#c2410c",
    "#4338ca",
    "#be123c",
    "#0f766e",
  ];

  const usedNames = new Set(existing.map((participant) => participant.name));
  const usedColors = new Set(existing.map((participant) => participant.color));
  const baseName = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${
    animals[Math.floor(Math.random() * animals.length)]
  }`;
  let name = baseName.slice(0, MAX_PARTICIPANT_NAME);
  let suffix = 2;
  while (usedNames.has(name)) {
    const suffixText = ` ${suffix}`;
    name = `${baseName.slice(0, MAX_PARTICIPANT_NAME - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  const color =
    colors.find((candidate) => !usedColors.has(candidate)) ??
    colors[Math.floor(Math.random() * colors.length)];

  return {
    id: nanoid(12),
    name,
    color,
  };
}

export function sanitizeAwarenessState(value: unknown): AwarenessState | null {
  const parsed = awarenessStateSchema.safeParse(value);
  if (!parsed.success) return null;
  return {
    user: parsed.data.user,
    cursor: parsed.data.cursor,
    selection: parsed.data.selection
      ? {
          slideId: parsed.data.selection.slideId,
          ids: parsed.data.selection.ids.slice(0, MAX_SELECTION_IDS),
        }
      : null,
  };
}

export function sanitizeParticipant(value: unknown): ParticipantState | null {
  const parsed = participantSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
