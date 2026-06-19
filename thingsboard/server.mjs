/**
 * server.js — Custom Next.js Server (ESM)
 *
 * Bu dosya standart `next dev` / `next start` komutu yerine kullanılır.
 * Şunları aynı Node.js sürecinde çalıştırır:
 *   1. Next.js HTTP sunucusu  (port 3000)
 *   2. aedes MQTT broker      (TCP port 1883)
 *   3. WebSocket sunucusu     (port 3001)
 *
 * Tüm protokollerde cihaz access token doğrulaması yapılır.
 *
 * Başlatma:
 *   node server.js            (production)
 *   NODE_ENV=development node server.js   (development)
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import net from "net";
import tls from "tls";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import "dotenv/config";

// ESM ortamında __dirname karşılığı
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── src/ altındaki gerçek modelleri import et (DRY — model çakışması çözüldü) ──
// Not: server.js Node.js native ESM ile çalışır; @/ alias'ı burada geçerli değildir.
import Device from "./src/models/Device.js";
import Telemetry from "./src/models/Telemetry.js";
import Alarm from "./src/models/Alarm.js";
import AuditLog from "./src/models/AuditLog.js";
import DeviceProfile from "./src/models/DeviceProfile.js";
import emitter from "./src/lib/event-emitter.js";
import logger from "./src/lib/logger.js";
import Redis from "ioredis";

// Redis bağlantısı (server.js kendi instance'ını kullanır)
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 200, 2000);
  },
});
redis.on("connect", () => logger.info("Redis bağlantısı kuruldu (server.js)"));
redis.on("error", (err) => logger.error({ err }, "Redis bağlantı hatası"));

const CACHE_TTL = 600; // 10 dakika

async function getCachedDevice(deviceId) {
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

async function getCachedProfile(profileId) {
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

// ------------------------------------------------------------------ //
// Inactive cihaz deneme takıpçısı
// ------------------------------------------------------------------ //
const INACTIVE_WINDOW = 3600;
const INACTIVE_NOTIFY = 3;
const INACTIVE_SECURITY = 20;

async function trackInactiveAttempt({ deviceId, deviceName, userId, ip, protocol }) {
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
// Ortam değişkenleri
// ------------------------------------------------------------------ //
const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const PORT = parseInt(process.env.PORT || "3000", 10);
const MQTT_PORT = parseInt(process.env.MQTT_PORT || "1883", 10);
const MQTTS_PORT = parseInt(process.env.MQTTS_PORT || "8883", 10);
const WS_PORT = parseInt(process.env.WS_PORT || "3001", 10);
const WSS_PORT = parseInt(process.env.WSS_PORT || "3002", 10);
const certsDir = path.join(__dirname, "certs");

// Sunucu instance referansları (graceful shutdown için)
let aedesInstance;
let mqttServer;
let mqttsServer;
let wsServer;
let wssServer;
let httpServer;

// ------------------------------------------------------------------ //
// MongoDB bağlantısı
// ------------------------------------------------------------------ //
async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI tanımlı değil!");
  await mongoose.connect(uri, { bufferCommands: false });
  logger.info("MongoDB bağlantısı kuruldu");
}

// ------------------------------------------------------------------ //
// Cihaz doğrulama (gerçek Device modeli kullanılıyor)
// ------------------------------------------------------------------ //
async function verifyDeviceToken(token) {
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
function isServerCertExist() {
  return fs.existsSync(path.join(certsDir, "server-cert.pem"));
}

async function verifyDeviceCertificate(fingerprint) {
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

// ------------------------------------------------------------------ //
// Telemetri işleyici — Gerçek Telemetry modelini kullanır
// ------------------------------------------------------------------ //
async function ingestTelemetry(items) {
  if (!items || items.length === 0) return;
  for (const item of items) {
    try {
      const parsedValue = (item.value !== "" && !isNaN(Number(item.value)))
        ? Number(item.value) : item.value;
      const valueType = typeof parsedValue === "number" ? "number" : "string";

      const doc = await Telemetry.create({
        userId: item.userId || null,
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
        deviceId: String(doc.deviceId),
      });

      // Alarm kontrolü
      checkAlarms(item.deviceId, item.key, parsedValue, item.userId);

      // Transport uyumsuzluk kontrolü
      checkTransportMismatch(item.deviceId, item.protocol, item.userId);
    } catch (err) {
      logger.error({ err, key: item.key }, "Telemetri kayıt hatası");
    }
  }
}

// ------------------------------------------------------------------ //
// Transport uyumsuzluk kontrolü — ilk seferde uyarı (24 saat TTL)
// ------------------------------------------------------------------ //
async function checkTransportMismatch(deviceId, protocol, userId) {
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
    }).catch(() => {});

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
// Alarm kontrolü — Seviye 2: AND/OR, string, timeWindow, cihaz kuralları
// ------------------------------------------------------------------ //

/**
 * Tekli koşul değerlendir: "key operator threshold"
 */
function evaluateSingle(expr, key, value, context) {
  if (!expr) return false;
  const match = expr.match(/^\s*(\w+)\s*(>=|<=|>|<|==|!=)\s*(.+?)\s*$/);
  if (!match) return false;
  const [, conditionKey, operator, thresholdRaw] = match;

  let actualValue;
  if (conditionKey === key) {
    actualValue = value;
  } else if (context[conditionKey] !== undefined) {
    actualValue = context[conditionKey];
  } else {
    return false;
  }

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
    const strValue = String(actualValue);
    const strThreshold = thresholdRaw.replace(/^["']|["']$/g, "");
    switch (operator) {
      case "==": return strValue === strThreshold;
      case "!=": return strValue !== strThreshold;
      default:   return false;
    }
  }
}

/**
 * Bileşik koşul değerlendirici (AND/OR destekli)
 */
function evaluateCondition(condition, key, value, context = {}) {
  if (!condition) return false;
  if (condition.includes(" AND ")) {
    return condition.split(" AND ").every((p) => evaluateCondition(p.trim(), key, value, context));
  }
  if (condition.includes(" OR ")) {
    return condition.split(" OR ").some((p) => evaluateCondition(p.trim(), key, value, context));
  }
  return evaluateSingle(condition, key, value, context);
}

/**
 * Redis sorted set ile sliding window kontrolü
 */
async function checkTimeWindow(deviceId, alarmType, windowConfig) {
  const { durationSeconds, triggerCount } = windowConfig;
  const redisKey = `alarm-window:${deviceId}:${alarmType}`;
  const now = Date.now();
  try {
    await redis.zremrangebyscore(redisKey, 0, now - durationSeconds * 1000);
    await redis.zadd(redisKey, now, `${now}`);
    await redis.expire(redisKey, durationSeconds + 60);
    const count = await redis.zcard(redisKey);
    return count >= triggerCount;
  } catch {
    return true;
  }
}

/**
 * Telemetri context cache güncelle
 */
async function updateTelemetryCtx(deviceId, key, value) {
  try {
    await redis.hset(`telemetry-ctx:${deviceId}`, key, JSON.stringify(value));
    await redis.expire(`telemetry-ctx:${deviceId}`, 3600);
  } catch {}
}

/**
 * Telemetri context cache oku
 */
async function getTelemetryCtx(deviceId) {
  try {
    const raw = await redis.hgetall(`telemetry-ctx:${deviceId}`);
    const ctx = {};
    for (const [k, v] of Object.entries(raw || {})) {
      try { ctx[k] = JSON.parse(v); } catch { ctx[k] = v; }
    }
    return ctx;
  } catch {
    return {};
  }
}

async function checkAlarms(deviceId, key, value, userId) {
  try {
    const device = await getCachedDevice(deviceId);
    if (!device) return;

    // Context cache güncelle
    await updateTelemetryCtx(deviceId, key, value);
    const context = await getTelemetryCtx(deviceId);

    // Profil alarm kuralları
    let profileRules = [];
    if (device.profile && device.profile !== "default") {
      const profile = await getCachedProfile(device.profile);
      if (profile?.alarms?.length) {
        profileRules = profile.alarms.map((r) => ({ ...r, _source: "PROFILE", _profileId: profile._id }));
      }
    }

    // Cihaz bazlı alarm kuralları
    const deviceRules = (device.alarms || []).map((r) => ({ ...r, _source: "DEVICE" }));

    const allRules = [...profileRules, ...deviceRules];
    if (allRules.length === 0) return;

    for (const rule of allRules) {
      const triggered = evaluateCondition(rule.createCondition, key, value, context);

      if (triggered) {
        if (rule.timeWindow?.enabled) {
          const windowMet = await checkTimeWindow(deviceId, rule.alarmType, rule.timeWindow);
          if (!windowMet) continue;
        }

        const existing = await Alarm.findOne({
          deviceId, type: rule.alarmType, status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
        });

        if (!existing) {
          const alarm = await Alarm.create({
            userId: userId || device.userId,
            deviceId,
            deviceName: device.name,
            profileId: rule._source === "PROFILE" ? rule._profileId : undefined,
            type: rule.alarmType,
            severity: rule.severity,
            status: "ACTIVE",
            source: rule._source,
            details: { key, triggerValue: value, threshold: rule.createCondition },
          });
          logger.info({ device: device.name, type: rule.alarmType, severity: rule.severity, source: rule._source }, "ALARM tetiklendi");
          emitter.emit("alarm", alarm.toObject());
        }
      }

      if (rule.clearCondition) {
        const shouldClear = evaluateCondition(rule.clearCondition, key, value, context);
        if (shouldClear) {
          const activeAlarm = await Alarm.findOne({
            deviceId, type: rule.alarmType, status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
          });
          if (activeAlarm) {
            activeAlarm.status = "CLEARED";
            activeAlarm.clearedAt = new Date();
            await activeAlarm.save();
            logger.info({ device: device.name, type: rule.alarmType }, "ALARM temizlendi");
            emitter.emit("alarm", activeAlarm.toObject());
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Alarm kontrolü sırasında hata");
  }
}

// ------------------------------------------------------------------ //
// WS ve WSS Mesaj işleyicisi
// ------------------------------------------------------------------ //
function attachMessageHandler(ws) {
  ws.on("message", async (raw) => {
    try {
      const body = JSON.parse(raw.toString());

      let deviceId = ws.deviceId;
      let userId = ws.userId;

      // deviceId yoksa, token fallback
      if (!deviceId) {
        if (!body.accessToken) {
          ws.send(JSON.stringify({ error: "accessToken veya sertifika zorunludur." }));
          return;
        }

        const device = await verifyDeviceToken(body.accessToken);
        if (!device) {
          ws.send(JSON.stringify({ error: "Cihaz doğrulanamadı" }));
          return;
        }
        deviceId = device._id.toString();
        userId = device.userId ? device.userId.toString() : null;
      }

      if (!body.key || body.value === undefined) {
        ws.send(JSON.stringify({ error: "key ve value alanları zorunludur." }));
        return;
      }

      await ingestTelemetry([{
        deviceId,
        userId,
        key: body.key,
        value: body.value,
        unit: body.unit,
        protocol: ws.authMethod === "certificate" ? "websocket-tls" : "websocket",
      }]);

    } catch (err) {
      logger.error({ err }, "WS mesaj işleme hatası");
      ws.send(JSON.stringify({ ok: false, message: "Mesaj ayrıştırma hatası" }));
    }
  });
}

// ------------------------------------------------------------------ //
// MQTT, WebSocket ve Next.js'i sırayla başlat
// ------------------------------------------------------------------ //
async function main() {
  await connectMongo();

  // ── MQTT Broker — Aedes v1.x ──
  const { Aedes } = await import("aedes");

  aedesInstance = await Aedes.createBroker({
    authenticate(client, username, password, callback) {
      // ─── Yol 1: TLS Sertifika ile doğrulama (mTLS) ───
      if (client.conn && client.conn.getPeerCertificate) {
        const peerCert = client.conn.getPeerCertificate(true);
        if (peerCert && peerCert.fingerprint256) {
          const fingerprint = peerCert.fingerprint256.replace(/:/g, "").toLowerCase();

          return verifyDeviceCertificate(fingerprint)
            .then((device) => {
              if (!device) {
                const err = new Error("Geçersiz cihaz sertifikası.");
                err.returnCode = 4;
                return callback(err, false);
              }
              client.deviceId = device._id.toString();
              client.deviceName = device.name;
              client.userId = device.userId ? device.userId.toString() : null;
              logger.info({ device: device.name, clientId: client.id }, "MQTTS sertifika auth başarılı");
              callback(null, true);
            })
            .catch((err) => {
              logger.error({ err }, "MQTTS sertifika auth hatası");
              err.returnCode = 4;
              callback(err, false);
            });
        }
      }

      // ─── Yol 2: Token ile doğrulama ───
      const token = username ? username.toString() : null;

      if (!token) {
        const err = new Error("Access token veya sertifika gerekli.");
        err.returnCode = 4;
        return callback(err, false);
      }

      verifyDeviceToken(token)
        .then((device) => {
          if (!device) {
            const err = new Error("Geçersiz access token.");
            err.returnCode = 4;
            return callback(err, false);
          }

          client.deviceId = device._id.toString();
          client.deviceName = device.name;
          client.userId = device.userId ? device.userId.toString() : null;
          logger.info({ device: device.name, clientId: client.id }, "MQTT token auth başarılı");
          callback(null, true);
        })
        .catch((err) => {
          logger.error({ err }, "MQTT auth hatası");
          err.returnCode = 4;
          callback(err, false);
        });
    },
  });

  // ─── TCP Port (1883) ───
  mqttServer = net.createServer(aedesInstance.handle);
  mqttServer.listen(MQTT_PORT, () => {
    logger.info(`MQTT Broker (TCP)  → mqtt://localhost:${MQTT_PORT}`);
  });

  // ─── TLS Port (8883) ───
  if (isServerCertExist()) {
    const tlsOptions = {
      key: fs.readFileSync(path.join(certsDir, "server-key.pem")),
      cert: fs.readFileSync(path.join(certsDir, "server-cert.pem")),
      ca: [fs.readFileSync(path.join(certsDir, "ca-cert.pem"))],
      requestCert: true,
      rejectUnauthorized: false,
    };

    mqttsServer = tls.createServer(tlsOptions, aedesInstance.handle);
    mqttsServer.listen(MQTTS_PORT, () => {
      logger.info(`MQTT Broker (TLS)  → mqtts://localhost:${MQTTS_PORT}`);
    });
  } else {
    logger.warn("TLS sertifikaları bulunamadı (certs/). MQTTS devre dışı.");
  }

  aedesInstance.on("client", (client) => {
    logger.info({ clientId: client.id, device: client.deviceName || "?" }, "MQTT bağlantı");
  });

  aedesInstance.on("clientDisconnect", (client) => {
    logger.info({ clientId: client.id }, "MQTT kopma");
  });

  aedesInstance.on("publish", async (packet, client) => {
    if (!client) return;
    if (!packet.topic.startsWith("devices/")) return;
    if (!client.deviceId) return;

    try {
      const raw = packet.payload.toString();
      const body = JSON.parse(raw);
      const topicParts = packet.topic.split("/");
      const topicKey = topicParts[3] ?? null;

      const items = [];

      if (body.key && body.value !== undefined) {
        items.push({ deviceId: client.deviceId, userId: client.userId, key: body.key, value: body.value, unit: body.unit, protocol: "mqtt" });
      } else if (topicKey && body.value !== undefined) {
        items.push({ deviceId: client.deviceId, userId: client.userId, key: topicKey, value: body.value, unit: body.unit, protocol: "mqtt" });
      } else {
        Object.entries(body)
          .filter(([k]) => k !== "deviceId" && k !== "accessToken")
          .forEach(([key, value]) => {
            items.push({ deviceId: client.deviceId, userId: client.userId, key, value, protocol: "mqtt" });
          });
      }

      await ingestTelemetry(items);
    } catch (err) {
      logger.error({ err }, "MQTT mesaj parse hatası");
    }
  });

  // ── WebSocket Sunucusu — port 3001 ──
  wsServer = new WebSocketServer({ port: WS_PORT }, () => {
    logger.info(`WebSocket sunucusu → ws://localhost:${WS_PORT}`);
  });

  wsServer.on("connection", (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info({ ip: clientIp }, "WS bağlantı");

    ws.authMethod = "pending_token";
    attachMessageHandler(ws);

    ws.on("close", () => {
      logger.info({ ip: clientIp }, "WS kopma");
    });
  });

  // ─── Secure WebSocket (WSS) ───
  if (isServerCertExist()) {
    const wssOptions = {
      key: fs.readFileSync(path.join(certsDir, "server-key.pem")),
      cert: fs.readFileSync(path.join(certsDir, "server-cert.pem")),
      ca: [fs.readFileSync(path.join(certsDir, "ca-cert.pem"))],
      requestCert: true,
      rejectUnauthorized: false,
    };

    const tlsServer = tls.createServer(wssOptions);
    wssServer = new WebSocketServer({ server: tlsServer });

    tlsServer.listen(WSS_PORT, () => {
      logger.info(`Secure WebSocket → wss://localhost:${WSS_PORT}`);
    });

    wssServer.on("connection", (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      logger.info({ ip: clientIp }, "WSS bağlantı");

      const tlsSocket = req.socket;
      const peerCert = tlsSocket.getPeerCertificate(true);

      if (peerCert && peerCert.fingerprint256) {
        const fingerprint = peerCert.fingerprint256.replace(/:/g, "").toLowerCase();

        verifyDeviceCertificate(fingerprint)
          .then((device) => {
            if (!device) {
              ws.send(JSON.stringify({ error: "Geçersiz cihaz sertifikası." }));
              ws.close();
              return;
            }

            ws.deviceId = device._id.toString();
            ws.userId = device.userId ? device.userId.toString() : null;
            ws.authMethod = "certificate";

            logger.info({ device: device.name }, "WSS sertifika auth başarılı");
            ws.send(JSON.stringify({ status: "authenticated", method: "certificate" }));

            attachMessageHandler(ws);
          })
          .catch((err) => {
            logger.error({ err }, "WSS sertifika doğrulama hatası");
            ws.send(JSON.stringify({ error: "Sertifika doğrulama hatası." }));
            ws.close();
          });
      } else {
        ws.authMethod = "pending_token";
        attachMessageHandler(ws);
      }

      ws.on("close", () => {
        logger.info({ ip: clientIp }, "WSS kopma");
      });
    });
  } else {
    logger.warn("TLS sertifikaları bulunamadı (certs/). WSS devre dışı.");
  }

  // ── Next.js HTTP Sunucusu ──
  const app = next({ dev, hostname, port: PORT });
  const handle = app.getRequestHandler();

  await app.prepare();

  httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error({ err, url: req.url }, "Next.js istek hatası");
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  httpServer.listen(PORT, () => {
    logger.info(`Next.js sunucusu → http://${hostname}:${PORT}`);
    logger.info(`Ortam: ${dev ? "development" : "production"}`);
  });
}

// ------------------------------------------------------------------ //
// Graceful Shutdown
// ------------------------------------------------------------------ //
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Kapatma sinyali alındı. Düzgün kapanış başlatılıyor…");

  const SHUTDOWN_TIMEOUT = 10_000; // 10 saniye

  // Timeout: zorla kapat
  const forceExit = setTimeout(() => {
    logger.error("Düzgün kapanış zaman aşımına uğradı. Zorla kapatılıyor.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    // 1. Yeni bağlantı kabul etmeyi durdur
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
      logger.info("HTTP sunucusu kapatıldı");
    }

    if (mqttServer) {
      await new Promise((resolve) => mqttServer.close(resolve));
      logger.info("MQTT TCP sunucusu kapatıldı");
    }

    if (mqttsServer) {
      await new Promise((resolve) => mqttsServer.close(resolve));
      logger.info("MQTT TLS sunucusu kapatıldı");
    }

    if (wsServer) {
      wsServer.clients.forEach((ws) => ws.close());
      await new Promise((resolve) => wsServer.close(resolve));
      logger.info("WebSocket sunucusu kapatıldı");
    }

    if (wssServer) {
      wssServer.clients.forEach((ws) => ws.close());
      // wssServer'ın underlying TLS server'ını kapat
      logger.info("Secure WebSocket sunucusu kapatıldı");
    }

    // 2. Aedes broker'ı kapat
    if (aedesInstance) {
      await new Promise((resolve) => aedesInstance.close(resolve));
      logger.info("Aedes MQTT broker kapatıldı");
    }

    // 3. MongoDB bağlantısını kapat
    await mongoose.connection.close();
    logger.info("MongoDB bağlantısı kapatıldı");

    clearTimeout(forceExit);
    logger.info("Düzgün kapanış tamamlandı.");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Kapanış sırasında hata oluştu");
    clearTimeout(forceExit);
    process.exit(1);
  }
}

// Başlat
main().catch((err) => {
  logger.error({ err }, "Sunucu başlatma hatası");
  process.exit(1);
});

// Kapanış sinyallerini dinle
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
