import fs from "fs";
import path from "path";
import Device from "../../models/Device.js";
import AuditLog from "../../models/AuditLog.js";
import Alarm from "../../models/Alarm.js";
import emitter from "../event-emitter.js";
import logger from "../logger.js";
import { redis } from "./redis-cache.js";

const certsDir = path.join(process.cwd(), "certs");

import { trackInactiveAttempt } from "../inactive-device-tracker.js";

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
        userId: device.userId, tenantId: device.tenantId, protocol: "mqtt",
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
        userId: device.userId, tenantId: device.tenantId, protocol: "mqtts",
      });
      return null;
    }
    return device;
  } catch (err) {
    logger.error({ err }, "Sertifika doğrulama hatası");
    return null;
  }
}
