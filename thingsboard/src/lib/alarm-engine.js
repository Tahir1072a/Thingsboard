/**
 * alarm-engine.js — Merkezi Alarm Değerlendirme Motoru
 *
 * Tüm alarm koşul değerlendirme ve tetikleme mantığı burada.
 * Hem telemetry-handler.js (HTTP) hem server.mjs (MQTT/WS) tarafından kullanılır.
 *
 * Desteklenen koşul formatları:
 *   "temperature > 50"                    — tek sayısal
 *   "status == error"                     — string karşılaştırma
 *   "temperature > 50 AND humidity > 80"  — bileşik AND
 *   "temperature > 50 OR pressure < 900"  — bileşik OR
 */

import redis from "@/lib/redis";
import connectDB from "@/lib/db";
import Alarm from "@/models/Alarm";
import emitter from "@/lib/event-emitter";
import { getCachedDevice, getCachedProfile } from "@/lib/cache";

// ────────────────────────────────────────────────────────────────────
// 1. Koşul Değerlendirici
// ────────────────────────────────────────────────────────────────────

/**
 * Tekli koşulu değerlendir: "key operator threshold"
 *
 * @param {string} expr      — "temperature > 50" veya "status == error"
 * @param {string} key       — gelen telemetri key'i
 * @param {*}      value     — gelen telemetri değeri
 * @param {object} context   — cihazın son telemetri değerleri (bileşik koşullar için)
 * @returns {boolean}
 */
function evaluateSingle(expr, key, value, context) {
  if (!expr) return false;

  const match = expr.match(/^\s*(\w+)\s*(>=|<=|>|<|==|!=)\s*(.+?)\s*$/);
  if (!match) return false;

  const [, conditionKey, operator, thresholdRaw] = match;

  // Değeri belirle: gelen key mi, context'ten mi?
  let actualValue;
  if (conditionKey === key) {
    actualValue = value;
  } else if (context[conditionKey] !== undefined) {
    actualValue = context[conditionKey];
  } else {
    return false; // Bu key'e ait veri yok
  }

  // Threshold: sayı mı string mi?
  const thresholdNum = parseFloat(thresholdRaw);
  const isNumeric = !isNaN(thresholdNum) && typeof actualValue === "number";

  if (isNumeric) {
    switch (operator) {
      case ">":  return actualValue > thresholdNum;
      case ">=": return actualValue >= thresholdNum;
      case "<":  return actualValue < thresholdNum;
      case "<=": return actualValue <= thresholdNum;
      case "==": return actualValue === thresholdNum;
      case "!=": return actualValue !== thresholdNum;
      default:   return false;
    }
  } else {
    // String karşılaştırma — tırnakları sil
    const strValue = String(actualValue);
    const strThreshold = thresholdRaw.replace(/^["']|["']$/g, "");
    switch (operator) {
      case "==": return strValue === strThreshold;
      case "!=": return strValue !== strThreshold;
      default:   return false; // >, < string için anlamsız
    }
  }
}

/**
 * Bileşik koşul değerlendirici (AND/OR destekli).
 *
 * @param {string} condition — "temperature > 50 AND humidity > 80"
 * @param {string} key       — gelen telemetri key'i
 * @param {*}      value     — gelen telemetri değeri
 * @param {object} context   — cihazın son telemetri değerleri
 * @returns {boolean}
 */
export function evaluateCondition(condition, key, value, context = {}) {
  if (!condition) return false;

  // AND ile bölme (AND öncelikli)
  if (condition.includes(" AND ")) {
    return condition
      .split(" AND ")
      .every((part) => evaluateCondition(part.trim(), key, value, context));
  }

  // OR ile bölme
  if (condition.includes(" OR ")) {
    return condition
      .split(" OR ")
      .some((part) => evaluateCondition(part.trim(), key, value, context));
  }

  // Tekli koşul
  return evaluateSingle(condition, key, value, context);
}

// ────────────────────────────────────────────────────────────────────
// 2. Telemetri Context Cache (bileşik koşullar için)
// ────────────────────────────────────────────────────────────────────

/**
 * Cihazın son telemetri değerlerini Redis'ten oku.
 */
export async function getDeviceTelemetryContext(deviceId) {
  try {
    const raw = await redis.hgetall(`telemetry-ctx:${deviceId}`);
    const context = {};
    for (const [k, v] of Object.entries(raw || {})) {
      try {
        context[k] = JSON.parse(v);
      } catch {
        context[k] = v;
      }
    }
    return context;
  } catch {
    return {};
  }
}

/**
 * Cihazın son telemetri değerini Redis'e yaz.
 */
export async function updateTelemetryContext(deviceId, key, value) {
  try {
    await redis.hset(`telemetry-ctx:${deviceId}`, key, JSON.stringify(value));
    await redis.expire(`telemetry-ctx:${deviceId}`, 3600); // 1 saat TTL
  } catch {
    // Redis hatası telemetriyi engellemeyecek
  }
}

// ────────────────────────────────────────────────────────────────────
// 3. Zaman Penceresi (Time Window)
// ────────────────────────────────────────────────────────────────────

/**
 * Redis sorted set ile sliding window kontrolü.
 *
 * @param {string} deviceId
 * @param {string} alarmType
 * @param {object} windowConfig — { durationSeconds, triggerCount }
 * @returns {boolean} — penceredeki tetikleme sayısı >= triggerCount ise true
 */
async function checkTimeWindow(deviceId, alarmType, windowConfig) {
  const { durationSeconds, triggerCount } = windowConfig;
  const redisKey = `alarm-window:${deviceId}:${alarmType}`;
  const now = Date.now();
  const windowStart = now - durationSeconds * 1000;

  try {
    // Eski kayıtları temizle
    await redis.zremrangebyscore(redisKey, 0, windowStart);

    // Yeni tetiklemeyi ekle
    await redis.zadd(redisKey, now, `${now}`);
    await redis.expire(redisKey, durationSeconds + 60);

    // Penceredeki tetikleme sayısını kontrol et
    const count = await redis.zcard(redisKey);
    return count >= triggerCount;
  } catch {
    // Redis hatası durumunda güvenli tarafta kal: tetikle
    return true;
  }
}

// ────────────────────────────────────────────────────────────────────
// 4. Merkezi Alarm Kontrol Fonksiyonu
// ────────────────────────────────────────────────────────────────────

/**
 * Tüm alarm kurallarını kontrol et (profil + cihaz bazlı).
 *
 * @param {string} deviceId
 * @param {string} key       — gelen telemetri key'i
 * @param {*}      value     — gelen telemetri değeri
 * @param {object} ownerInfo — { userId, tenantId }
 */
export async function checkAlarms(deviceId, key, value, ownerInfo = {}) {
  const { userId, tenantId } = ownerInfo;
  try {
    await connectDB();

    const device = await getCachedDevice(deviceId);
    if (!device) return;

    // Telemetri context — bileşik koşullar için son değerler
    const context = await getDeviceTelemetryContext(deviceId);

    // 1. Profil alarm kuralları
    let profileRules = [];
    if (device.profile && device.profile !== "default") {
      const profile = await getCachedProfile(device.profile);
      if (profile?.alarms?.length) {
        profileRules = profile.alarms.map((r) => ({
          ...r,
          _source: "PROFILE",
          _profileId: profile._id,
        }));
      }
    }

    // 2. Cihaz bazlı alarm kuralları
    const deviceRules = (device.alarms || []).map((r) => ({
      ...r,
      _source: "DEVICE",
    }));

    // 3. Tüm kuralları birleştir
    const allRules = [...profileRules, ...deviceRules];
    if (allRules.length === 0) return;

    for (const rule of allRules) {
      // ── Tetikleme Kontrolü ──
      const triggered = evaluateCondition(
        rule.createCondition,
        key,
        value,
        context
      );

      if (triggered) {
        // Zaman penceresi kontrolü
        if (rule.timeWindow?.enabled) {
          const windowMet = await checkTimeWindow(
            deviceId,
            rule.alarmType,
            rule.timeWindow
          );
          if (!windowMet) continue; // Henüz yeterli tetikleme yok
        }

        // Mevcut aktif alarm var mı?
        const existing = await Alarm.findOne({
          deviceId,
          type: rule.alarmType,
          status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
        });

        if (!existing) {
          const alarm = await Alarm.create({
            userId: userId || device.userId,
            tenantId: tenantId || device.tenantId,
            deviceId,
            deviceName: device.name,
            profileId: rule._source === "PROFILE" ? rule._profileId : undefined,
            type: rule.alarmType,
            severity: rule.severity,
            status: "ACTIVE",
            source: rule._source,
            details: {
              key,
              triggerValue: value,
              threshold: rule.createCondition,
            },
          });

          console.log(
            `🚨 ALARM: ${device.name} → ${rule.alarmType} (${rule.severity}) [${rule._source}]`
          );
          emitter.emit("alarm", alarm.toObject());
        }
      }

      // ── Temizleme Kontrolü ──
      if (rule.clearCondition) {
        const shouldClear = evaluateCondition(
          rule.clearCondition,
          key,
          value,
          context
        );
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

            console.log(
              `✅ ALARM TEMİZLENDİ: ${device.name} → ${rule.alarmType}`
            );
            emitter.emit("alarm", activeAlarm.toObject());
          }
        }
      }
    }
  } catch (err) {
    console.error("[alarm-engine] Hata:", err.message);
  }
}
