/**
 * redis.js — Singleton Redis Bağlantı Yöneticisi
 *
 * Next.js hot-reload sırasında çoklu bağlantı açılmasını önlemek için
 * global scope'ta tek bir Redis instance tutulur.
 *
 * Ortam değişkeni: REDIS_URL (varsayılan: redis://localhost:6379)
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const globalKey = "__redis_client__";

function getRedisClient() {
  if (global[globalKey]) {
    return global[globalKey];
  }

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 5) return null; // 5 denemeden sonra vazgeç
      return Math.min(times * 200, 2000);
    },
  });

  client.on("connect", () => {
    console.log("✅ Redis bağlantısı kuruldu");
  });

  client.on("error", (err) => {
    console.error("[Redis] Bağlantı hatası:", err.message);
  });

  // İlk bağlantıyı kur
  client.connect().catch((err) => {
    console.error("[Redis] İlk bağlantı başarısız:", err.message);
  });

  global[globalKey] = client;
  return client;
}

const redis = getRedisClient();

export default redis;
