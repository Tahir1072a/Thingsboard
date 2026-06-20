/**
 * cache.js — Redis Cache Yardımcı Fonksiyonları
 *
 * Cihaz ve profil bilgilerini Redis'te önbelleğe alarak
 * alarm motorunun her telemetride MongoDB'ye sorgu atmasını engeller.
 *
 * TTL (Time-to-Live): 10 dakika — bu süre içinde MongoDB'ye gidilmez.
 * Cihaz veya profil güncellendiğinde ilgili anahtar invalidate edilir.
 */

import redis from "./redis.js";
import connectDB from "./db.js";
import Device from "../models/Device.js";
import DeviceProfile from "../models/DeviceProfile.js";

const CACHE_TTL = 600;

/**
 * Cihaz bilgisini önbellekten veya MongoDB'den getirir.
 * Redis anahtarı: "device:{deviceId}"
 */
export async function getCachedDevice(deviceId) {
  if (!deviceId) return null;

  const cacheKey = `device:${deviceId}`;

  try {
    // 1. Önce Redis'e bak
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("Cache'den device verisi çekildi");
      return JSON.parse(cached);
    }
  } catch (err) {
    // Redis erişilemezse MongoDB'ye düş (graceful degradation)
    console.warn("[cache] Redis okuma hatası, MongoDB'ye düşülüyor:", err.message);
  }

  // 2. Redis'te yoksa MongoDB'den çek
  await connectDB();
  const device = await Device.findById(deviceId).lean();
  if (!device) return null;

  // 3. Redis'e yaz (TTL ile)
  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(device));
  } catch (err) {
    console.warn("[cache] Redis yazma hatası:", err.message);
  }

  return device;
}

/**
 * Profil bilgisini önbellekten veya MongoDB'den getirir.
 * Redis anahtarı: "profile:{profileId}"
 */
export async function getCachedProfile(profileId) {
  if (!profileId) return null;

  const cacheKey = `profile:${profileId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn("[cache] Redis okuma hatası, MongoDB'ye düşülüyor:", err.message);
  }

  await connectDB();
  const profile = await DeviceProfile.findById(profileId).lean();
  if (!profile) return null;

  try {
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(profile));
  } catch (err) {
    console.warn("[cache] Redis yazma hatası:", err.message);
  }

  return profile;
}

/**
 * Cihaz güncellendiğinde veya silindiğinde cache'i temizler.
 */
export async function invalidateDevice(deviceId) {
  try {
    await redis.del(`device:${deviceId}`);
  } catch (err) {
    console.warn("[cache] Device invalidation hatası:", err.message);
  }
}

/**
 * Profil güncellendiğinde veya silindiğinde cache'i temizler.
 */
export async function invalidateProfile(profileId) {
  try {
    await redis.del(`profile:${profileId}`);
  } catch (err) {
    console.warn("[cache] Profile invalidation hatası:", err.message);
  }
}
