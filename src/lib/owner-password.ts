import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LEN = 64;

/** Hash a password with a random salt. Format: saltHex:hashHex */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

/** Verify password against stored hash, or legacy plaintext (migrates on match). */
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  // Legacy plaintext (pre-hashing)
  if (!stored.includes(":")) {
    return password === stored;
  }

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, KEY_LEN);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function isHashedPassword(stored: string): boolean {
  return stored.includes(":") && stored.split(":")[0].length === 32;
}

/** Generate a temporary password suitable for one-time handoff. */
export function generateTemporaryPassword(): string {
  const chunk = randomBytes(9).toString("base64url");
  return `HL-${chunk}`;
}
