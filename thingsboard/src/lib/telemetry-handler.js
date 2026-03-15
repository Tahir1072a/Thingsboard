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
import DeviceProfile from "@/models/DeviceProfile";
import Alarm from "@/models/Alarm";
import emitter from "@/lib/event-emitter";

/**
 * Access token ile cihazı doğrula.
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
 * Basit karşılaştırma koşulunu değerlendir.
 * Güvenli: sadece sayısal karşılaştırmaları destekler (eval yok).
 *
 * Koşul formatı: "key > 50", "temperature <= 30"
 */
function evaluateCondition(condition, key, value) {
  if (!condition) return false;

  // "temperature > 50" → operatörü ve eşiği ayıkla
  const match = condition.match(/^\s*\w+\s*(>=|<=|>|<|==|!=)\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return false;

  const operator = match[1];
  const threshold = parseFloat(match[2]);

  switch (operator) {
    case ">":  return value > threshold;
    case ">=": return value >= threshold;
    case "<":  return value < threshold;
    case "<=": return value <= threshold;
    case "==": return value === threshold;
    case "!=": return value !== threshold;
    default:   return false;
  }
}

/**
 * Telemetri verisi kaydedildikten sonra alarm kurallarını kontrol et.
 */
async function checkAlarms(deviceId, key, value) {
  try {
    // Cihazı bul → profilini al
    const device = await Device.findById(deviceId).lean();
    if (!device || !device.profile || device.profile === "default") return;

    // Profili bul
    const profile = await DeviceProfile.findOne({ name: device.profile }).lean();
    if (!profile || !profile.alarms || profile.alarms.length === 0) return;

    for (const rule of profile.alarms) {
      // Tetikleme koşulunu kontrol et
      const triggered = evaluateCondition(rule.createCondition, key, value);

      if (triggered) {
        // Bu cihaz + bu alarm tipi için aktif alarm var mı?
        const existing = await Alarm.findOne({
          deviceId,
          type: rule.alarmType,
          status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
        });

        if (!existing) {
          // Yeni alarm oluştur
          const alarm = await Alarm.create({
            deviceId,
            deviceName: device.name,
            profileId: profile._id,
            type: rule.alarmType,
            severity: rule.severity,
            status: "ACTIVE",
            details: {
              key,
              triggerValue: value,
              threshold: rule.createCondition,
            },
          });

          console.log(`🚨 ALARM: ${device.name} → ${rule.alarmType} (${rule.severity})`);
          emitter.emit("alarm", alarm.toObject());
        }
      }

      // Temizleme koşulunu kontrol et
      if (rule.clearCondition) {
        const shouldClear = evaluateCondition(rule.clearCondition, key, value);
        if (shouldClear) {
          const activeAlarm = await Alarm.findOne({
            deviceId,
            type: rule.alarmType,
            status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
          });

          if (activeAlarm) {
            activeAlarm.status = "CLEARED";
            activeAlarm.clearedAt = new Date();
            await activeAlarm.save();
            console.log(`✅ ALARM TEMİZLENDİ: ${device.name} → ${rule.alarmType}`);
            emitter.emit("alarm", activeAlarm.toObject());
          }
        }
      }
    }
  } catch (err) {
    // Alarm kontrolü telemetriyi engellemeyecek
    console.error("[alarm-check] Hata:", err.message);
  }
}

/**
 * Ham telemetri mesajını işler.
 */
export async function handleTelemetry(payload) {
  const { deviceId, key, value, unit, protocol = "http", timestamp } = payload;

  if (!deviceId || !key || value === undefined || value === null) {
    throw new Error(
      "Geçersiz telemetri: deviceId, key ve value alanları zorunludur."
    );
  }

  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) {
    throw new Error(`'value' sayısal bir değer olmalıdır. Alınan: ${value}`);
  }

  await connectDB();

  const doc = await Telemetry.create({
    deviceId,
    key,
    value: numericValue,
    unit: unit ?? null,
    protocol,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  });

  const lean = doc.toObject();

  // SSE event'i yayınla
  emitter.emit("telemetry", lean);

  // Alarm kurallarını kontrol et (async, telemetriyi bloklamaz)
  checkAlarms(deviceId, key, numericValue);

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

