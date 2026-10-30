import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

const scrypt = promisifyScrypt();

function promisifyScrypt() {
  return (
    password: string,
    salt: Buffer,
    keylen: number,
    options: ScryptOptions,
  ): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      });
    });
}

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;
const PIN_PATTERN = /^\d{6}$/u;

export interface DeckPins {
  editPin: string;
  viewPin: string;
}

export function isSixDigitPin(value: string): boolean {
  return PIN_PATTERN.test(value);
}

export function generateSixDigitPin(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function generateDeckPins(): DeckPins {
  const editPin = generateSixDigitPin();
  let viewPin = generateSixDigitPin();
  while (viewPin === editPin) viewPin = generateSixDigitPin();
  return { editPin, viewPin };
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scrypt(pin, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })) as Buffer;
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPin(
  pin: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored || !isSixDigitPin(pin)) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nValue, rValue, pValue, saltValue, hashValue] = parts;
  const n = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    n < 2 ||
    r < 1 ||
    p < 1 ||
    n > 1_048_576 ||
    r > 64 ||
    p > 16
  ) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltValue, "base64url");
    expected = Buffer.from(hashValue, "base64url");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = (await scrypt(pin, salt, expected.length, { N: n, r, p })) as Buffer;
  } catch {
    return false;
  }
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
