/**
 * server.js — Custom Next.js Server
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

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const net = require("net");
const tls = require("tls");
const fs = require("fs");
const path = require("path");

// Aedes v1.x ESM modül — main() içinde dynamic import ile yüklenir
let aedes;
const { WebSocketServer } = require("ws");

// ------------------------------------------------------------------ //
// Ortam değişkenleri
// ------------------------------------------------------------------ //
require("dotenv").config();

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const PORT = parseInt(process.env.PORT || "3000", 10);
const MQTT_PORT = parseInt(process.env.MQTT_PORT || "1883", 10);
const MQTTS_PORT = parseInt(process.env.MQTTS_PORT || "8883", 10);
const WS_PORT = parseInt(process.env.WS_PORT || "3001", 10);
const WSS_PORT = parseInt(process.env.WSS_PORT || "3002", 10);
const certsDir = path.join(__dirname, "certs");

// ------------------------------------------------------------------ //
// MongoDB bağlantısı ve modeller
// ------------------------------------------------------------------ //
const mongoose = require("mongoose");
const { EventEmitter } = require("events");

// Singleton EventEmitter — Next.js SSE endpoint'iyle aynı instance
const emitterKey = "__telemetry_emitter__";
if (!global[emitterKey]) {
  const em = new EventEmitter();
  em.setMaxListeners(200);
  global[emitterKey] = em;
}
const emitter = global[emitterKey];

// MongoDB bağlantısı
async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI tanımlı değil!");
  await mongoose.connect(uri, { bufferCommands: false });
  console.log("✅ MongoDB bağlantısı kuruldu (server.js)");
}

// Device modeli
function getDeviceModel() {
  if (mongoose.models.Device) return mongoose.models.Device;
  const s = new mongoose.Schema({
    name: String,
    accessToken: { type: String, index: true },
    status: { type: String, default: "active" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }, { collection: "devices", strict: false });
  return mongoose.model("Device", s);
}

// Telemetry modeli
function getTelemetryModel() {
  if (mongoose.models.Telemetry) return mongoose.models.Telemetry;
  const s = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    deviceId: mongoose.Schema.Types.ObjectId,
    key: String,
    value: Number,
    unit: String,
    protocol: String,
    timestamp: { type: Date, default: () => new Date() },
  }, { collection: "telemetries", timestamps: false, strict: false });
  return mongoose.model("Telemetry", s);
}

// ------------------------------------------------------------------ //
// Cihaz doğrulama
// ------------------------------------------------------------------ //
async function verifyDeviceToken(token) {
  if (!token) return null;
  try {
    const Device = getDeviceModel();
    const device = await Device.findOne({ accessToken: token }).lean();
    if (!device) return null;
    if (device.status === "inactive") return null;
    return device;
  } catch (err) {
    console.error("[server] Token doğrulama hatası:", err.message);
    return null;
  }
}

// ------------------------------------------------------------------ //
// Sunucunun sertifikasını doğrulama
// ------------------------------------------------------------------ //

function isServerCertExist() {
  return fs.existsSync(path.join(certsDir, "server-cert.pem"));
}

// ------------------------------------------------------------------ //
// Sertifika parmak izi ile cihaz doğrulama
// ------------------------------------------------------------------ //
async function verifyDeviceCertificate(fingerprint) {
  if (!fingerprint) return null;
  try {
    const Device = getDeviceModel();
    const device = await Device.findOne({
      certificateFingerprint: fingerprint,
      authType: "X509",
    }).lean();
    if (!device) return null;
    if (device.status === "inactive") return null;
    return device;
  } catch (err) {
    console.error("[server] Sertifika doğrulama hatası:", err.message);
    return null;
  }
}

// ------------------------------------------------------------------ //
// Telemetri işleyici
// ------------------------------------------------------------------ //
async function ingestTelemetry(items) {
  if (!items || items.length === 0) return;
  try {
    const Telemetry = getTelemetryModel();

    for (const item of items) {
      const doc = await Telemetry.create({
        userId: item.userId || null,
        deviceId: item.deviceId,
        key: item.key,
        value: item.value,
        unit: item.unit || null,
        protocol: item.protocol || "internal",
        timestamp: item.timestamp || new Date(),
      });

      emitter.emit("telemetry", {
        userId: item.userId ? String(item.userId) : null,
        deviceId: String(doc.deviceId),
        key: doc.key,
        value: doc.value,
        unit: doc.unit,
        protocol: doc.protocol,
        timestamp: doc.timestamp,
      });

      // Alarm kontrolünü tetikle (MQTT verilerinin de alarm üretmesini sağlar)
      emitter.emit("check-alarms", {
        deviceId: String(doc.deviceId),
        userId: item.userId ? String(item.userId) : null,
        key: doc.key,
        value: doc.value,
      });
    }
  } catch (err) {
    console.error("[server] Telemetri kayıt hatası:", err.message);
  }
}

// ------------------------------------------------------------------ //
// WS ve WSS Mesaj işleyicisi
// ------------------------------------------------------------------ //
async function attachMessageHandler(ws) {
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
      }])

    } catch (err) {
      console.error("[server] Mesaj işleme hatası:", err.message);
      ws.send(JSON.stringify({ ok: false, message: "Mesaj ayrıştırma hatası" }))
    }
  })
}

// ------------------------------------------------------------------ //
// MQTT, WebSocket ve Next.js'i sırayla başlat
// ------------------------------------------------------------------ //
async function main() {
  await connectMongo();

  // 2. MQTT Broker — Aedes v1.x: createBroker() kullanılmalı
  const { Aedes } = await import("aedes");

  aedes = await Aedes.createBroker({
    authenticate: function (client, username, password, callback) {
      // ─── Yol 1: TLS Sertifika ile doğrulama (mTLS) ───
      if (client.conn && client.conn.getPeerCertificate) {
        const peerCert = client.conn.getPeerCertificate(true);
        if (peerCert && peerCert.fingerprint256) {
          // Node.js fingerprint formatı: "AB:CD:EF:..." → hex string'e çevir
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
              console.log(`[MQTTS] Sertifika auth başarılı: ${device.name} (${client.id})`);
              callback(null, true);
            })
            .catch((err) => {
              console.error("[MQTTS] Sertifika auth hatası:", err.message);
              err.returnCode = 4;
              callback(err, false);
            });
        }
      }

      // ─── Yol 2: Token ile doğrulama (Eski yöntem) ───
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
          console.log(`[MQTT] Token auth başarılı: ${device.name} (${client.id})`);
          callback(null, true);
        })
        .catch((err) => {
          console.error("[MQTT] Auth hatası:", err.message);
          err.returnCode = 4;
          callback(err, false);
        });
    },
  });

  // ─── TCP Port (1883) — Token tabanlı cihazlar ───
  const mqttServer = net.createServer(aedes.handle);
  mqttServer.listen(MQTT_PORT, () => {
    console.log(`✅ MQTT Broker (TCP)  → mqtt://localhost:${MQTT_PORT}`);
  });

  // ─── TLS Port (8883) — Sertifika tabanlı cihazlar (mTLS) ───
  if (isServerCertExist()) {
    const tlsOptions = {
      key: fs.readFileSync(path.join(certsDir, "server-key.pem")),
      cert: fs.readFileSync(path.join(certsDir, "server-cert.pem")),
      ca: [fs.readFileSync(path.join(certsDir, "ca-cert.pem"))],
      requestCert: true,
      rejectUnauthorized: false,
    };

    const mqttsServer = tls.createServer(tlsOptions, aedes.handle);
    mqttsServer.listen(MQTTS_PORT, () => {
      console.log(`✅ MQTT Broker (TLS)  → mqtts://localhost:${MQTTS_PORT}`);
    });
  } else {
    console.warn("⚠️  TLS sertifikaları bulunamadı (certs/). MQTTS devre dışı.");
    console.warn("'node scripts/generate-ca.js' çalıştırarak sertifika üretin.");
  }

  aedes.on("client", (client) => {
    console.log(`[MQTT] Bağlantı: ${client.id} (${client.deviceName || "?"})`);
  });

  aedes.on("clientDisconnect", (client) => {
    console.log(`[MQTT] Kopma: ${client.id}`);
  });

  aedes.on("publish", async (packet, client) => {
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
      console.error("[MQTT] Mesaj parse hatası:", err.message);
    }
  });

  // 3. WebSocket Sunucusu — port 3001
  const wss = new WebSocketServer({ port: WS_PORT }, () => {
    console.log(`✅ WebSocket sunucusu başlatıldı → ws://localhost:${WS_PORT}`);
  });

  wss.on("connection", (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[WS] Bağlantı: ${clientIp}`);

    // ws:// sadece token destekler, pending_token olarak işaretle
    ws.authMethod = "pending_token";
    attachMessageHandler(ws);

    ws.on("close", () => {
      console.log(`[WS] Kopma: ${clientIp}`);
    });
  });

  if (isServerCertExist) {
    const wssOptions = {
      key: fs.readFileSync(path.join(certsDir, "server-key.pem")),
      cert: fs.readFileSync(path.join(certsDir, "server-cert.pem")),
      ca: [fs.readFileSync(path.join(certsDir, "ca-cert.pem"))],
      requestCert: true,
      rejectUnauthorized: false, // Sertifikasız cihazlarda içeri alınsın.
    };

    const tlsServer = tls.createServer(wssOptions);
    const wss_secure = new WebSocketServer({ server: tlsServer });

    tlsServer.listen(WSS_PORT, () => {
      console.log(`✅ Secure WebSocket sunucusu başlatıldı → wss://localhost:${WSS_PORT}`)
    });

    wss_secure.on("connection", (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`[WSS] Bağlantı: ${clientIp}`)

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

            console.log(`[WSS] Sertifika auth başarılı: ${device.name}`)
            ws.send(JSON.stringify({ status: "authenticated", method: "certificate" }));

            attachMessageHandler(ws);
          })
          .catch((err) => {
            console.error("[WSS] Sertifika doğrulama hatası:", err.message);
            ws.send(JSON.stringify({ error: "Sertifika doğrulama hatası." }));
            ws.close();
          });
      } else {
        ws.authMethod = "pending_token";
        attachMessageHandler(ws);
      }

      ws.on("close", () => {
        console.log(`[WSS] Kopma: ${clientIp}`);
      });

    });

  } else {
    console.warn("⚠️  TLS sertifikaları bulunamadı (certs/). WSS devre dışı.");
  }

  // 4. Next.js HTTP Sunucusu — port 3000
  const app = next({ dev, hostname, port: PORT });
  const handle = app.getRequestHandler();

  await app.prepare();

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Next.js istek hatası:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`✅ Next.js sunucusu başlatıldı  → http://${hostname}:${PORT}`);
    console.log(`   Ortam: ${dev ? "development" : "production"}`);
  });
}

// Başlat
main().catch((err) => {
  console.error("❌ Sunucu başlatma hatası:", err);
  process.exit(1);
});

// ------------------------------------------------------------------ //
// Temiz kapanış
// ------------------------------------------------------------------ //
process.on("SIGTERM", () => {
  console.log("SIGTERM sinyali alındı. Sunucu kapatılıyor…");
  aedes.close();
  process.exit(0);
});
