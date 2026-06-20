/**
 * rate-limit.js — Redis Tabanlı Rate Limiter
 *
 * Sliding window counter algoritması ile istek sınırlaması yapar.
 * Redis kullanarak distributed ortamlarda tutarlı çalışır.
 *
 * Kullanım:
 *   import { rateLimit } from "./rate-limit.js";
 *
 *   export async function POST(request) {
 *     const limited = await rateLimit(request, { max: 10, windowSec: 900, keyPrefix: "auth" });
 *     if (limited) return limited; // 429 yanıtı döner
 *     // ... normal işlem
 *   }
 */

import { NextResponse } from "next/server";
import redis from "./redis.js";
import logger from "./logger.js";

/**
 * @param {Request} request - Next.js Request nesnesi
 * @param {Object} options
 * @param {number} options.max - Pencere içinde izin verilen maksimum istek sayısı
 * @param {number} options.windowSec - Pencere süresi (saniye)
 * @param {string} options.keyPrefix - Redis key öneki (rate-limit:auth, rate-limit:api vb.)
 * @param {string} [options.identifier] - Özel tanımlayıcı (varsayılan: IP adresi)
 * @returns {NextResponse|null} - Limit aşılırsa 429 yanıtı, değilse null
 */
export async function rateLimit(request, { max = 100, windowSec = 900, keyPrefix = "api", identifier = null } = {}) {
  try {
    // Tanımlayıcı: özel değer veya IP adresi
    const id = identifier ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const key = `rate-limit:${keyPrefix}:${id}`;

    // Atomic increment + TTL
    const current = await redis.incr(key);

    // İlk istekse TTL ayarla
    if (current === 1) {
      await redis.expire(key, windowSec);
    }

    // Kalan istek sayısı
    const remaining = Math.max(0, max - current);

    // Limit aşıldı mı?
    if (current > max) {
      const ttl = await redis.ttl(key);

      logger.warn({ key, current, max, ttl }, "Rate limit aşıldı");

      return NextResponse.json(
        {
          ok: false,
          message: "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.",
          retryAfter: ttl,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ttl),
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(ttl),
          },
        }
      );
    }

    // Limit aşılmadı → null döner, handler devam eder
    return null;
  } catch (err) {
    // Redis hatası rate limiting'i engellemeyecek (graceful degradation)
    logger.error({ err }, "Rate limit kontrolü sırasında hata");
    return null;
  }
}

/**
 * Hazır yapılandırmalar
 */
export const RATE_LIMITS = {
  // Auth (login/register): 10 istek / 15 dakika
  auth: { max: 10, windowSec: 900, keyPrefix: "auth" },

  // Genel API: 100 istek / 15 dakika
  api: { max: 100, windowSec: 900, keyPrefix: "api" },

  // Telemetri gönderimi: 600 istek / dakika (cihaz başına)
  telemetry: { max: 600, windowSec: 60, keyPrefix: "telemetry" },
};
