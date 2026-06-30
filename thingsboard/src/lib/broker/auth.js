import fs from "fs";
import path from "path";
import Device from "../../models/Device.js";
import AuditLog from "../../models/AuditLog.js";
import Alarm from "../../models/Alarm.js";
import emitter from "../event-emitter.js";
import logger from "../logger.js";
import { redis } from "./redis-cache.js";

const certsDir = path.join(process.cwd(), "certs");

// ------------------------------------------------------------------ //
// Inactive cihaz deneme takıpçısı
// ------------------------------------------------------------------ //
const INACTIVE_WINDOW = 3600;
const INACTIVE_NOTIFY = 3;
const INACTIVE_SECURITY = 20;

export async function trackInactiveAttempt({ deviceId, deviceName, userId, ip, protocol }) {
  try {
    const key = `inactive-attempt:${deviceId}`;
    const attemptCount = await redis.incr(key);
    if (attemptCount === 1) await redis.expire(key, INACTIVE_WINDOW);

    // Audit log kaydı
    AuditLog.create({
      userId, action: "INACTIVE_DEVICE_REJECTED", entityType: "DEVICE",
      entityId: deviceId, entityName: deviceName, status: "FAILURE",
      details: { ip, protocol, attemptCount, reason: "Cihaz inactive durumda." },
    }).catch(() => { });

    // 3+ deneme: SSE bildirimi
    if (attemptCount >= INACTIVE_NOTIFY) {
      emitter.emit("audit-log", {
        userId: String(userId), action: "INACTIVE_DEVICE_REJECTED",
        entityType: "DEVICE", entityId: String(deviceId), entityName: deviceName,
        status: "FAILURE", timestamp: new Date(),
        details: {
          ip, protocol, attemptCount, alert: true,
          reason: `${deviceName} devre dışı ama ${attemptCount} kez veri göndermeye çalıştı.`
        },
      });
    }

    // 20+ deneme: Güvenlik alarmı (bir kez)
    if (attemptCount === INACTIVE_SECURITY) {
      const existing = await Alarm.findOne({
        deviceId, type: "SECURITY_ALERT", status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
      });
      if (!existing) {
        const alarm = await Alarm.create({
          userId, deviceId, deviceName, type: "SECURITY_ALERT",
          severity: "CRITICAL", status: "ACTIVE",
          details: {
            key: "inactive_attempts", triggerValue: attemptCount,
            threshold: `${INACTIVE_SECURITY} deneme/saat`, ip, protocol
          },
        });
        logger.warn({ device: deviceName, attempts: attemptCount, ip },
          "GÜVENLİK ALARMI: Inactive cihazdan yoğun erişim denemesi");
        emitter.emit("alarm", alarm.toObject());
      }
    }
  } catch (err) {
    logger.error({ err, deviceId }, "Inactive tracking hatası");
  }
}

// ------------------------------------------------------------------ //
// Cihaz doğrulama (Token)
// ------------------------------------------------------------------ //
export async function verifyDeviceToken(token) {
  if (!token) return null;
  try {
    const device = await Device.findOne({ accessToken: token }).lean();
    if (!device) return null;
    if (device.status === "inactive") {
      trackInactiveAttempt({
        deviceId: device._id, deviceName: device.name,
        userId: device.userId, protocol: "mqtt",
      });
      return null;
    }
    return device;
  } catch (err) {
    logger.error({ err }, "Token doğrulama hatası");
    return null;
  }
}

// ------------------------------------------------------------------ //
// Sertifika kontrolleri
// ------------------------------------------------------------------ //
export function isServerCertExist() {
  return fs.existsSync(path.join(certsDir, "server-cert.pem"));
}

export async function verifyDeviceCertificate(fingerprint) {
  if (!fingerprint) return null;
  try {
    const device = await Device.findOne({
      certificateFingerprint: fingerprint,
      authType: "X509",
    }).lean();
    if (!device) return null;
    if (device.status === "inactive") {
      trackInactiveAttempt({
        deviceId: device._id, deviceName: device.name,
        userId: device.userId, protocol: "mqtts",
      });
      return null;
    }
    return device;
  } catch (err) {
    logger.error({ err }, "Sertifika doğrulama hatası");
    return null;
  }
}
