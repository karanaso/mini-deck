import { randomInt } from "node:crypto";

const JOIN_CODE_PATTERN = /^\d{7}$/u;

export type JoinCodeAvailable = (code: string) => Promise<boolean>;

export function isSevenDigitJoinCode(value: string): boolean {
  return JOIN_CODE_PATTERN.test(value);
}

export function generateSevenDigitJoinCode(): string {
  return randomInt(0, 10_000_000).toString().padStart(7, "0");
}

export async function generateUniqueJoinCode(
  isAvailable: JoinCodeAvailable,
  attempts = 20,
): Promise<string> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const code = generateSevenDigitJoinCode();
    if (await isAvailable(code)) return code;
  }
  throw new Error("Could not generate a unique join code");
}
