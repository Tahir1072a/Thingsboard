import crypto from "crypto";
import bcrypt from "bcryptjs";

export function genToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export async function hashPassword(raw) {
  const saltRounds = 12;
  return bcrypt.hash(raw, saltRounds);
}

export async function verifyPassword(raw, hash) {
  return bcrypt.compare(raw, hash);
}
