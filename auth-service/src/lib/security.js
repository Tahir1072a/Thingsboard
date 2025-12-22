import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generateToken(bytes = 32) {
  // BaseUrl64: Oluşturulan rastgele token'ı url'lerde kullanılabilecek bir yapıya getirmek için kullanılır. + => -, / => _ vb. karakter değişimleri yapar.
  return crypto.randomBytes(bytes).toString("base64url");
}

export async function hashPassword(raw) {
  const saltRounds = 12;
  // Gelen raw datayı (çıplak), hashleyerek return eder.
  return bcrypt.hash(raw, saltRounds);
}

export async function verifyPassword(raw, hashPassword) {
  return bcrypt.compare(raw, hashPassword);
}
