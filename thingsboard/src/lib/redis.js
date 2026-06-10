/**
 * redis.js — Singleton Redis Bağlantı Yöneticisi
 */
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Next.js hot-reload sırasında objeyi kaybetmemek için globalThis kullanımı
const globalForRedis = globalThis;

// Eğer globalde bir client varsa onu kullan, yoksa SADECE BİR KEZ oluştur
const redis = globalForRedis.__redis_client__ ?? new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 5) return null; // 5 denemeden sonra vazgeç
    return Math.min(times * 200, 2000);
  },
});

// Event listener'ların her seferinde üst üste binmesini engellemek için kontrol
if (!globalForRedis.__redis_listeners_added__) {
  redis.on("connect", () => {
    console.log("✅ Redis bağlantısı kuruldu");
  });

  redis.on("error", (err) => {
    console.error("[Redis] Bağlantı hatası:", err.message);
  });

  redis.on("reconnecting", () => {
    console.warn("⚠️ Redis yeniden bağlanıyor...");
  });

  globalForRedis.__redis_listeners_added__ = true;
}

// Geliştirme (development) ortamında global nesneye kaydet. 
if (process.env.NODE_ENV !== "production") {
  globalForRedis.__redis_client__ = redis;
}

export default redis;