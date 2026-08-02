import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// PIN di-hash scrypt (salt acak). Format tersimpan: "<saltHex>:<hashHex>".
// PIN 4–8 digit; kekuatan asli datang dari lockout, bukan panjang PIN.
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^[0-9]{4,8}$/.test(pin);
}
