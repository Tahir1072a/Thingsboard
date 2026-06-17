/**
 * r2.js — Cloudflare R2 İstemci Konfigürasyonu
 *
 * S3 uyumlu API üzerinden Cloudflare R2 storage'a dosya yükleme.
 * .env dosyasında gerekli değişkenler:
 *   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import { S3Client } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME || "thingsboard-uploads";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";
export default r2;
