import Telemetry from "../../models/Telemetry.js";
import AuditLog from "../../models/AuditLog.js";
import emitter from "../event-emitter.js";
import logger from "../logger.js";
import { checkAlarms, updateTelemetryContext } from "../alarm-engine.js";
import { redis, getCachedDevice, getCachedProfile } from "./redis-cache.js";

// ------------------------------------------------------------------ //
// Transport uyumsuzluk kontrolü — ilk seferde uyarı (24 saat TTL)
// ------------------------------------------------------------------ //
export async function checkTransportMismatch(deviceId, protocol, userId) {
  try {
    if (!protocol || protocol === "internal") return;

    const device = await getCachedDevice(deviceId);
    if (!device || !device.profile) return;

    const profile = await getCachedProfile(device.profile);
    if (!profile || !profile.transportType) return;

    // Protokol eşleme: mqtt → MQTT, http → HTTP, ws → HTTP (HTTP upgrade)
    const protocolMap = { mqtt: "MQTT", mqtts: "MQTT", http: "HTTP", ws: "HTTP", wss: "HTTP" };
    const expected = profile.transportType;
    const actual = protocolMap[protocol] || protocol.toUpperCase();

    if (actual === expected) return;

    // Redis ile ilk seferi takip et (24 saat TTL)
    const redisKey = `transport-mismatch:${deviceId}`;
    const alreadyWarned = await redis.get(redisKey);
    if (alreadyWarned) return;

    await redis.set(redisKey, "1", "EX", 86400);

    logger.warn(
      { device: device.name, expected, actual: protocol },
      "Transport uyumsuzluğu: profil ayarı ile farklı protokol"
    );

    // Audit log
    AuditLog.create({
      userId: userId || device.userId,
      action: "TRANSPORT_MISMATCH",
      entityType: "DEVICE",
      entityId: deviceId,
      entityName: device.name || "",
      status: "SUCCESS",
      details: {
        expected,
        actual: protocol,
        profileName: profile.name,
        message: `Cihaz "${device.name}" profilde ${expected} tanımlı ama ${protocol} ile veri gönderdi.`,
      },
    }).catch(() => { });

    // SSE uyarısı
    emitter.emit("audit-log", {
      userId: String(userId || device.userId),
      action: "TRANSPORT_MISMATCH",
      entityType: "DEVICE",
      entityId: String(deviceId),
      entityName: device.name || "",
      status: "SUCCESS",
      details: {
        expected,
        actual: protocol,
        profileName: profile.name,
        alert: true,
      },
      timestamp: new Date(),
    });
  } catch (err) {
    logger.error({ err }, "Transport mismatch kontrolü hatası");
  }
}

// ------------------------------------------------------------------ //
// Telemetri işleyici
// ------------------------------------------------------------------ //
export async function ingestTelemetry(items) {
  if (!items || items.length === 0) return;
  
  for (const item of items) {
    try {
      const parsedValue = (item.value !== "" && !isNaN(Number(item.value)))
        ? Number(item.value) : item.value;
      const valueType = typeof parsedValue === "number" ? "number" : "string";

      const doc = await Telemetry.create({
        userId: item.userId || null,
        tenantId: item.tenantId || null,
        deviceId: item.deviceId,
        key: item.key,
        value: parsedValue,
        valueType,
        unit: item.unit || null,
        protocol: item.protocol || "internal",
        timestamp: item.timestamp || new Date(),
      });

      const lean = doc.toObject();

      // SSE event'i yayınla
      emitter.emit("telemetry", {
        ...lean,
        userId: item.userId ? String(item.userId) : null,
        tenantId: item.tenantId ? String(item.tenantId) : null,
        deviceId: String(doc.deviceId),
      });

      // Telemetri context cache güncelle (compound alarm koşulları için)
      updateTelemetryContext(item.deviceId, item.key, parsedValue);

      // Alarm kontrolü
      checkAlarms(item.deviceId, item.key, parsedValue, { userId: item.userId, tenantId: item.tenantId });

      // Transport uyumsuzluk kontrolü
      checkTransportMismatch(item.deviceId, item.protocol, item.userId);
    } catch (err) {
      logger.error({ err, key: item.key }, "Telemetri kayıt hatası");
    }
  }
}
