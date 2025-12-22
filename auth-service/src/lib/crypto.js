import crypto from "crypto";
import AppError from "../utilts/AppError.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY = crypto
  .createHash("sha256")
  .update(String(process.env.ENCRYPTION_KEY))
  .digest("base64")
  .slice(0, 32);

if (!process.env.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY .env dosyasında tanımlanmamış!");
}

// verilen texti, aes-256-gcm algoritmasına göre şifreler.
export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH); // salt'a benzer
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  // AuthTag bizim mühürümüzdür. Şifrelemede tek bir bit bile değişse bile bu authTah geçersiz hale gelir.
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

// Şifreli metni alır
export function decrypt(encryptedText) {
  try {
    const data = Buffer.from(encryptedText, "base64url"); // Şifreli metni byte dizisine çevirir

    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  } catch (err) {
    console.error("Şifre çözme hatası:", error.message);
    throw new AppError("Veri şifresi çözülemedi (Decrypt failed)", 500);
  }
}
