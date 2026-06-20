/**
 * inactive-device-tracker.js — Inactive Cihaz Deneme Takipçisi
 *
 * Devre dışı cihazlardan gelen bağlantı/veri gönderim denemelerini
 * Redis'te sayar ve yoğunluğa göre aksiyon alır:
 *
 *   1-2 deneme  → Sadece audit log kaydı
 *   3+ deneme   → Audit log + SSE ile kullanıcıya bildirim
 *   20+ deneme  → Audit log + SSE + Güvenlik alarmı oluştur
 *
 * Redis key: "inactive-attempt:{deviceId}" → TTL: 1 saat
 */

import redis from "./redis.js";
import Alarm from "../models/Alarm.js";
import { createAuditLog } from "./audit-service.js";
import emitter from "./event-emitter.js";
import logger from "./logger.js";

const WINDOW_SECONDS = 3600; // 1 saat
const NOTIFY_THRESHOLD = 3; // SSE bildirimi eşiği
const SECURITY_THRESHOLD = 20; // Güvenlik alarmı eşiği

/**
 * Inactive cihaz denemesini izler ve yoğunluğa göre aksiyon alır.
 *
 * @param {Object} params
 * @param {string} params.deviceId   - Cihaz MongoDB ID'si
 * @param {string} params.deviceName - Cihaz adı (bildirim için)
 * @param {string} params.userId     - Cihaz sahibinin user ID'si
 * @param {string} params.ip         - İstemci IP adresi
 * @param {string} params.protocol   - Kullanılan protokol (mqtt/http/websocket)
 */
export async function trackInactiveAttempt({
  deviceId,
  deviceName,
  userId,
  ip = "unknown",
  protocol = "unknown",
}) {
  try {
    const key = `inactive-attempt:${deviceId}`;

    // Atomic increment + TTL
    const attemptCount = await redis.incr(key);
    if (attemptCount === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    // ── Her zaman: Audit log kaydı oluştur ──
    createAuditLog({
      userId,
      action: "INACTIVE_DEVICE_REJECTED",
      entityType: "DEVICE",
      entityId: deviceId,
      entityName: deviceName,
      status: "FAILURE",
      details: {
        ip,
        protocol,
        attemptCount,
        reason: "Cihaz inactive durumda. Veri gönderimi reddedildi.",
      },
    });

    // ── 3+ deneme: SSE ile kullanıcıya bildirim ──
    if (attemptCount >= NOTIFY_THRESHOLD) {
      emitter.emit("audit-log", {
        userId: String(userId),
        action: "INACTIVE_DEVICE_REJECTED",
        entityType: "DEVICE",
        entityId: String(deviceId),
        entityName: deviceName,
        status: "FAILURE",
        details: {
          ip,
          protocol,
          attemptCount,
          reason: `${deviceName} devre dışı ama ${attemptCount} kez veri göndermeye çalıştı.`,
          alert: true,
        },
        timestamp: new Date(),
      });
    }

    // ── 20+ deneme: Güvenlik alarmı oluştur (bir kez) ──
    if (attemptCount === SECURITY_THRESHOLD) {
      try {
        // Bu cihaz için zaten aktif SECURITY_ALERT var mı?
        const existing = await Alarm.findOne({
          deviceId,
          type: "SECURITY_ALERT",
          status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
        });

        if (!existing) {
          const alarm = await Alarm.create({
            userId,
            deviceId,
            deviceName,
            type: "SECURITY_ALERT",
            severity: "CRITICAL",
            status: "ACTIVE",
            details: {
              key: "inactive_attempts",
              triggerValue: attemptCount,
              threshold: `${SECURITY_THRESHOLD} deneme/saat`,
              ip,
              protocol,
            },
          });

          logger.warn(
            { device: deviceName, attempts: attemptCount, ip },
            "GÜVENLİK ALARMI: Inactive cihazdan yoğun erişim denemesi"
          );

          emitter.emit("alarm", alarm.toObject());

          // Güvenlik alarmını da audit log'a kaydet
          createAuditLog({
            userId,
            action: "SECURITY_ALERT",
            entityType: "DEVICE",
            entityId: deviceId,
            entityName: deviceName,
            details: {
              ip,
              protocol,
              attemptCount,
              reason: `${deviceName} cihazından ${attemptCount}+ erişim denemesi. Güvenlik alarmı oluşturuldu.`,
            },
          });
        }
      } catch (alarmErr) {
        logger.error({ err: alarmErr }, "Güvenlik alarmı oluşturma hatası");
      }
    }
  } catch (err) {
    // Tracker hatası ana akışı engellemeyecek
    logger.error({ err, deviceId }, "Inactive device tracking hatası");
  }
}
