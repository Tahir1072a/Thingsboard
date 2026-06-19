/**
 * telemetry-handler.js
 *
 * Telemetri mesajlarını normalize eden, access token ile cihaz doğrulayan,
 * MongoDB'ye kaydeden, SSE event emitter üzerinden browser'lara ileten
 * ve alarm kurallarını kontrol eden ortak işleyici.
 */

import connectDB from "@/lib/db";
import Device from "@/models/Device";
import Telemetry from "@/models/Telemetry";
import emitter from "@/lib/event-emitter";
import { checkAlarms, updateTelemetryContext } from "@/lib/alarm-engine";

/**
 * Access token ile cihazı doğrula.
 * Dönüş objesinde userId dahildir.
 */
export async function authenticateDevice(accessToken) {
  if (!accessToken) {
    throw new Error("Access token zorunludur. (X-Access-Token header)");
  }

  await connectDB();
  const device = await Device.findByToken(accessToken);

  if (!device) {
    throw new Error("Geçersiz access token. Cihaz sisteme kayıtlı değil.");
  }

  if (device.status === "inactive") {
    throw new Error("Cihaz devre dışı. Veri göndermek için aktif olmalıdır.");
  }

  return device;
}

/**
 * Ham telemetri mesajını işler.
 * userId parametresi artık zorunludur.
 */
export async function handleTelemetry(payload) {
  const { deviceId, userId, tenantId, key, value, unit, protocol = "http", timestamp } = payload;

  if (!deviceId || !key || value === undefined || value === null) {
    throw new Error(
      "Geçersiz telemetri: deviceId, key ve value alanları zorunludur."
    );
  }

  let valueType = "string";
  let parsedValue = value;

  if (typeof value === "boolean" || value === "true" || value === "false") {
    valueType = "boolean";
    parsedValue = value === "true" || value === true;
  } else if (value !== "" && !isNaN(Number(value))) {
    valueType = "number";
    parsedValue = Number(value);
  } else if (typeof value === "object" && value !== null) {
    valueType = "json";
    parsedValue = JSON.stringify(value);
  } else if (typeof value === "string") {
    try {
      const parsedJson = JSON.parse(value);
      if (typeof parsedJson === "object" && parsedJson !== null) {
        valueType = "json";
      }
    } catch {
      // it is just a string
    }
  }

  await connectDB();

  const doc = await Telemetry.create({
    userId,
    tenantId,
    deviceId,
    key,
    value: parsedValue,
    valueType,
    unit: unit ?? null,
    protocol,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  });

  const lean = doc.toObject();

  // SSE event'i yayınla (tenantId dahil)
  emitter.emit("telemetry", { ...lean, userId: String(userId), tenantId: tenantId ? String(tenantId) : null });

  // Telemetri context cache güncelle (bileşik koşullar için)
  updateTelemetryContext(deviceId, key, parsedValue);

  // Alarm kurallarını kontrol et (merkezi motor)
  checkAlarms(deviceId, key, parsedValue, { userId, tenantId });

  return lean;
}

/**
 * MQTT topic'ini parse ederek deviceId ve key'i çıkarır.
 */
export function parseMqttTopic(topic) {
  const parts = topic.split("/");

  if (parts[0] === "devices" && parts[2] === "telemetry") {
    return {
      deviceId: parts[1],
      key: parts[3] ?? null,
    };
  }

  return { deviceId: null, key: null };
}
