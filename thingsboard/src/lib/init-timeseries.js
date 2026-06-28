/**
 * init-timeseries.js — MongoDB Time-Series Collection Başlatıcı
 *
 * Bu script uygulama başlangıcında çalışır ve:
 * 1. "telemetries" koleksiyonunu time-series olarak oluşturur (yoksa)
 * 2. TTL (expireAfterSeconds) ile otomatik veri temizliği sağlar
 * 3. Mevcut normal koleksiyonu time-series'e dönüştürmez (MongoDB izin vermez)
 *
 * Kullanım: server.mjs veya db.js'den import edilip çağrılır
 */

import mongoose from "mongoose";
import logger from "./logger.js";

/** Varsayılan TTL: 90 gün (saniye cinsinden) */
const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60; // 7,776,000

/**
 * Telemetri koleksiyonunu MongoDB native Time-Series Collection olarak oluşturur.
 * Eğer koleksiyon zaten varsa (normal veya time-series), uyarı loglar ama hata vermez.
 *
 * @param {number} ttlSeconds - Otomatik silme süresi (varsayılan 90 gün)
 */
export async function initTimeSeriesCollection(ttlSeconds = DEFAULT_TTL_SECONDS) {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      logger.warn("[TimeSeries] MongoDB bağlantısı henüz hazır değil, atlanıyor.");
      return;
    }

    // Mevcut koleksiyonları kontrol et
    const collections = await db.listCollections({ name: "telemetries" }).toArray();

    if (collections.length > 0) {
      const existing = collections[0];
      if (existing.type === "timeseries") {
        logger.info("[TimeSeries] 'telemetries' zaten time-series koleksiyonu olarak mevcut. ✅");
      } else {
        logger.warn(
          "[TimeSeries] 'telemetries' normal koleksiyon olarak mevcut. " +
          "Time-series'e otomatik dönüştürülemez. " +
          "Mevcut verileri yedekleyip koleksiyonu yeniden oluşturmanız gerekebilir."
        );
      }
      return;
    }

    // Time-Series Collection oluştur
    await db.createCollection("telemetries", {
      timeseries: {
        timeField: "timestamp",
        metaField: "deviceId",
        granularity: "seconds",
      },
      expireAfterSeconds: ttlSeconds,
    });

    logger.info(
      `[TimeSeries] 'telemetries' time-series koleksiyonu oluşturuldu. ` +
      `TTL: ${Math.round(ttlSeconds / 86400)} gün ✅`
    );
  } catch (err) {
    // Koleksiyon zaten varsa (race condition) sessizce geç
    if (err.codeName === "NamespaceExists") {
      logger.info("[TimeSeries] 'telemetries' koleksiyonu zaten mevcut.");
      return;
    }
    logger.error("[TimeSeries] Koleksiyon oluşturma hatası:", err.message);
  }
}

/**
 * Eski telemetri verilerini temizleyen yardımcı fonksiyon.
 * Time-Series koleksiyonlarında TTL otomatik çalışır,
 * bu fonksiyon normal koleksiyonlar için fallback olarak kullanılabilir.
 *
 * @param {number} days - Kaç günden eski veriler silinsin (varsayılan 90)
 */
export async function cleanupOldTelemetry(days = 90) {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db.collection("telemetries").deleteMany({
      timestamp: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      logger.info(
        `[Cleanup] ${result.deletedCount} eski telemetri kaydı silindi (>${days} gün).`
      );
    }

    return result.deletedCount;
  } catch (err) {
    logger.error("[Cleanup] Telemetri temizleme hatası:", err.message);
    return 0;
  }
}
