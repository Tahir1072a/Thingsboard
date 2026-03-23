/**
 * simulate-devices.js
 *
 * 10 sanal cihazı oluşturur (veya mevcut olanları kullanır) ve
 * HTTP, MQTT, WebSocket üzerinden telemetri verisi gönderir.
 *
 * Access token sistemi: Her cihaz kendi token'ı ile kimlik doğrular.
 *
 * Multi-tenancy: SIMULATOR_USER_ID ortam değişkeni ile kullanıcı belirtilir.
 * Cihazlar doğrudan MongoDB'ye kaydedilir (API session bypass).
 * Telemetri gönderimi access token ile yapılır (değişiklik yok).
 *
 * Kullanım:
 *   SIMULATOR_USER_ID=<mongo_user_id> npm run simulate
 */

import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";

const HTTP_URL = process.env.SIMULATOR_HTTP_URL ?? "http://localhost:3000";
const MQTT_URL = process.env.SIMULATOR_MQTT_URL ?? "mqtt://localhost:1883";
const WS_URL = process.env.SIMULATOR_WS_URL ?? "ws://localhost:3001";
const MONGODB_URI = process.env.MONGODB_URI;
const SIMULATOR_USER_ID = process.env.SIMULATOR_USER_ID;

const DEVICE_COUNT = 10;
const SEND_INTERVAL_MS = 1000; // 1 saniye

// ------------------------------------------------------------------ //
// MongoDB bağlantısı ve modeller
// ------------------------------------------------------------------ //
async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI ortam değişkeni tanımlı değil!");
  }
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅ MongoDB bağlantısı kuruldu (simulator)");
}

function getDeviceModel() {
  if (mongoose.models.Device) return mongoose.models.Device;
  const s = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: String,
    profile: { type: mongoose.Schema.Types.ObjectId, ref: "DeviceProfile", default: null },
    tag: { type: String, default: "" },
    description: { type: String, default: "" },
    status: { type: String, default: "active" },
    isGateway: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    accessToken: { type: String, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    additionalInfo: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  }, { collection: "devices", timestamps: true, strict: false });
  return mongoose.model("Device", s);
}

function getUserModel() {
  if (mongoose.models.User) return mongoose.models.User;
  const s = new mongoose.Schema({
    email: String,
    firstName: String,
    lastName: String,
  }, { collection: "users", strict: false });
  return mongoose.model("User", s);
}

// ------------------------------------------------------------------ //
// Yardımcı: rastgele yürüyüş
// ------------------------------------------------------------------ //
function randomWalk(prev, min, max, step = 0.5) {
  const delta = (Math.random() - 0.5) * 2 * step;
  return Math.min(max, Math.max(min, prev + delta));
}

// ------------------------------------------------------------------ //
// 1. Kullanıcıyı doğrula ve cihazları oluştur
// ------------------------------------------------------------------ //
async function resolveUserId() {
  if (!SIMULATOR_USER_ID) {
    // SIMULATOR_USER_ID verilmemişse, ilk kullanıcıyı kullan
    const User = getUserModel();
    const firstUser = await User.findOne().lean();
    if (!firstUser) {
      throw new Error(
        "Veritabanında kullanıcı bulunamadı. Önce bir kullanıcı oluşturun veya SIMULATOR_USER_ID belirtin."
      );
    }
    console.log(`ℹ️  SIMULATOR_USER_ID belirtilmedi → ilk kullanıcı kullanılıyor: ${firstUser.email} (${firstUser._id})`);
    return firstUser._id.toString();
  }
  return SIMULATOR_USER_ID;
}

async function ensureDevices(userId) {
  const Device = getDeviceModel();
  const devices = [];

  for (let i = 1; i <= DEVICE_COUNT; i++) {
    const protocol = i <= 4 ? "http" : i <= 7 ? "mqtt" : "ws";
    const name = `sim-${protocol}-${String(i).padStart(3, "0")}`;

    try {
      // Önce mevcut cihazı ara (user-scoped)
      const existing = await Device.findOne({ name, userId }).lean();

      if (existing) {
        console.log(`✅ Mevcut cihaz: ${name} (token: ${existing.accessToken})`);
        devices.push({ ...existing, protocol });
        continue;
      }

      // Yoksa doğrudan MongoDB'ye oluştur
      const accessToken = crypto.randomBytes(32).toString("base64url");
      const newDevice = await Device.create({
        userId,
        name,
        tag: `simulator-${protocol}`,
        description: `Simülatör cihazı (${protocol.toUpperCase()})`,
        accessToken,
        status: "active",
      });

      console.log(`🆕 Yeni cihaz: ${name} (token: ${newDevice.accessToken})`);
      devices.push({ ...newDevice.toObject(), protocol });
    } catch (err) {
      console.error(`❌ ${name} hatası:`, err.message);
    }
  }

  return devices;
}

// ------------------------------------------------------------------ //
// 2. HTTP ile veri gönder
// ------------------------------------------------------------------ //
async function sendHTTP(device, metrics) {
  try {
    const res = await fetch(`${HTTP_URL}/api/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": device.accessToken,
      },
      body: JSON.stringify({
        metrics: Object.entries(metrics).map(([key, value]) => ({
          key,
          value,
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error(`[HTTP] ${device.name} hata:`, data.message);
    }
  } catch (err) {
    console.error(`[HTTP] ${device.name} bağlantı hatası:`, err.message);
  }
}

// ------------------------------------------------------------------ //
// 3. MQTT ile veri gönder
// ------------------------------------------------------------------ //
let mqttClient = null;
let mqttReady = false;

async function setupMQTT(devices) {
  const mqttDevices = devices.filter((d) => d.protocol === "mqtt");
  if (mqttDevices.length === 0) return;

  try {
    const mqtt = await import("mqtt");

    // Her MQTT cihaz için ayrı bağlantı (her birinin kendi token'ı var)
    for (const device of mqttDevices) {
      const client = mqtt.default.connect(MQTT_URL, {
        clientId: `sim-${device.name}-${Date.now()}`,
        username: device.accessToken, // Token = MQTT username
        password: "",
      });

      client.on("connect", () => {
        console.log(`[MQTT] ${device.name} bağlandı`);
        device._mqttClient = client;
        device._mqttReady = true;
      });

      client.on("error", (err) => {
        console.error(`[MQTT] ${device.name} hata:`, err.message);
      });
    }
  } catch (err) {
    console.error("[MQTT] mqtt paketi yüklenemedi:", err.message);
  }
}

function sendMQTT(device, metrics) {
  if (!device._mqttClient || !device._mqttReady) return;

  const topic = `devices/${device._id}/telemetry`;
  device._mqttClient.publish(topic, JSON.stringify(metrics));
}

// ------------------------------------------------------------------ //
// 4. WebSocket ile veri gönder
// ------------------------------------------------------------------ //
const wsClients = new Map();

async function setupWS(devices) {
  const wsDevices = devices.filter((d) => d.protocol === "ws");
  if (wsDevices.length === 0) return;

  const { default: WebSocket } = await import("ws");

  for (const device of wsDevices) {
    const ws = new WebSocket(WS_URL);

    ws.on("open", () => {
      console.log(`[WS] ${device.name} bağlandı`);
      wsClients.set(device._id.toString(), ws);
    });

    ws.on("error", (err) => {
      console.error(`[WS] ${device.name} hata:`, err.message);
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.error) {
        console.error(`[WS] ${device.name} sunucu hatası:`, msg.error);
      }
    });
  }
}

function sendWS(device, metrics) {
  const ws = wsClients.get(device._id.toString());
  if (!ws || ws.readyState !== 1) return;

  for (const [key, value] of Object.entries(metrics)) {
    ws.send(
      JSON.stringify({
        accessToken: device.accessToken,
        key,
        value,
      })
    );
  }
}

// ------------------------------------------------------------------ //
// 5. Ana döngü
// ------------------------------------------------------------------ //
async function main() {
  console.log("📡 Cihaz simülatörü başlatılıyor...\n");

  // MongoDB'ye bağlan
  await connectDB();

  // Kullanıcıyı çözümle
  const userId = await resolveUserId();
  console.log(`👤 Kullanıcı ID: ${userId}\n`);

  // Cihazları oluştur/getir (doğrudan MongoDB)
  const devices = await ensureDevices(userId);
  if (devices.length === 0) {
    console.error("❌ Hiç cihaz oluşturulamadı.");
    process.exit(1);
  }

  console.log(`\n✅ ${devices.length} cihaz hazır\n`);

  // Protokol bağlantıları kur
  await setupMQTT(devices);
  await setupWS(devices);

  // Bağlantıların oturması için biraz bekle
  await new Promise((r) => setTimeout(r, 2000));

  // Her cihaz için başlangıç değerleri
  const state = {};
  for (const d of devices) {
    state[d._id.toString()] = {
      temperature: 20 + Math.random() * 10,
      humidity: 40 + Math.random() * 20,
    };
  }

  console.log("📊 Veri gönderimi başlıyor...\n");

  setInterval(() => {
    for (const device of devices) {
      const id = device._id.toString();
      const s = state[id];
      s.temperature = randomWalk(s.temperature, -10, 50, 0.5);
      s.humidity = randomWalk(s.humidity, 10, 95, 1);

      const metrics = {
        temperature: Math.round(s.temperature * 100) / 100,
        humidity: Math.round(s.humidity * 100) / 100,
      };

      switch (device.protocol) {
        case "http":
          sendHTTP(device, metrics);
          break;
        case "mqtt":
          sendMQTT(device, metrics);
          break;
        case "ws":
          sendWS(device, metrics);
          break;
      }
    }
  }, SEND_INTERVAL_MS);

  console.log("✅ Simülatör çalışıyor. Durdurmak için Ctrl+C.\n");
}

main().catch(console.error);
