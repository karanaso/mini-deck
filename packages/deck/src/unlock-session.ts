import type { Role } from "./types.js";
import {
  base64UrlToString,
  base64UrlToBytes,
  bytesToBase64Url,
  stringToBase64Url,
} from "./tokens.js";

const TOKEN_VERSION = "v1";
const encoder = new TextEncoder();
export const UNLOCK_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const DEV_UNLOCK_SESSION_SECRET =
  "mini-deck-development-unlock-session-secret";

export interface UnlockSessionPayload {
  deckId: string;
  role: Role;
  pinVersion: number;
  exp: number;
}

export function resolveUnlockSessionSecret(
  configured: string | undefined,
  nodeEnv: string | undefined,
): string {
  const secret = configured?.trim() ?? "";
  if (nodeEnv === "production") {
    if (secret.length < 32) {
      throw new Error(
        "DECK_SESSION_SECRET must be at least 32 characters in production",
      );
    }
    return secret;
  }
  return secret.length >= 32 ? secret : DEV_UNLOCK_SESSION_SECRET;
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function isValidPayload(value: unknown): value is UnlockSessionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.deckId === "string" &&
    payload.deckId.length > 0 &&
    (payload.role === "editor" || payload.role === "viewer") &&
    typeof payload.pinVersion === "number" &&
    Number.isInteger(payload.pinVersion) &&
    payload.pinVersion >= 0 &&
    typeof payload.exp === "number" &&
    Number.isFinite(payload.exp)
  );
}

export async function createUnlockSessionToken(
  payload: UnlockSessionPayload,
  secret: string,
): Promise<string> {
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const key = await importSigningKey(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload)),
  );
  return `${TOKEN_VERSION}.${encodedPayload}.${bytesToBase64Url(signature)}`;
}

export async function verifyUnlockSessionToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<UnlockSessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;
  const [, encodedPayload, encodedSignature] = parts;

  let payload: unknown;
  let signature: Uint8Array;
  try {
    payload = JSON.parse(base64UrlToString(encodedPayload));
    signature = base64UrlToBytes(encodedSignature);
  } catch {
    return null;
  }
  if (!isValidPayload(payload) || payload.exp <= now) return null;

  const key = await importSigningKey(secret);
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload)),
  );
  if (!constantTimeEqual(signature, expected)) return null;
  return payload;
}
