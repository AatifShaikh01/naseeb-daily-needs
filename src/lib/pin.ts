/**
 * PIN hashing — bcryptjs
 * Format: bcrypt hash string
 * Used on server side only.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(pin, storedHash);
}

export const PIN_PATTERN = /^\d{4,8}$/;
