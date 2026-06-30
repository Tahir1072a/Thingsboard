import Redis from "ioredis";
import logger from "../logger.js";
import Device from "../../models/Device.js";
import DeviceProfile from "../../models/DeviceProfile.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => logger.info("Redis bağlantısı kuruldu (broker/redis-cache.js)"));
redis.on("error", (err) => logger.error({ err }, "Redis bağlantı hatası"));

const CACHE_TTL = 600; // 10 dakika

export async function getCachedDevice(deviceId) {
  if (!deviceId) return null;
  const cacheKey = `device:${deviceId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* Redis hatası → MongoDB'ye düş */ }
  
  const device = await Device.findById(deviceId).lean();
  if (!device) return null;
  
  try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(device)); } catch { /* ignore */ }
  return device;
}

export async function getCachedProfile(profileId) {
  if (!profileId) return null;
  const cacheKey = `profile:${profileId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch { /* Redis hatası → MongoDB'ye düş */ }
  
  const profile = await DeviceProfile.findById(profileId).lean();
  if (!profile) return null;
  
  try { await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(profile)); } catch { /* ignore */ }
  return profile;
}
