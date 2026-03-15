/**
 * simulate-devices.js
 *
 * 10 sanal cihazı oluşturur (veya mevcut olanları kullanır) ve
 * HTTP, MQTT, WebSocket üzerinden telemetri verisi gönderir.
 *
 * Access token sistemi: Her cihaz kendi token'ı ile kimlik doğrular.
 *
 * Kullanım:
 *   npm run simulate
 */

import "dotenv/config";

const HTTP_URL = process.env.SIMULATOR_HTTP_URL ?? "http://localhost:3000";
const MQTT_URL = process.env.SIMULATOR_MQTT_URL ?? "mqtt://localhost:1883";
const WS_URL = process.env.SIMULATOR_WS_URL ?? "ws://localhost:3001";

const DEVICE_COUNT = 10;
const SEND_INTERVAL_MS = 1000; // 1 saniye

// ------------------------------------------------------------------ //
// Yardımcı: rastgele yürüyüş
// ------------------------------------------------------------------ //
function randomWalk(prev, min, max, step = 0.5) {
  const delta = (Math.random() - 0.5) * 2 * step;
  return Math.min(max, Math.max(min, prev + delta));
}

// ------------------------------------------------------------------ //
// 1. Cihazları oluştur veya mevcut olanları al
// ------------------------------------------------------------------ //
async function ensureDevices() {
  const devices = [];

  for (let i = 1; i <= DEVICE_COUNT; i++) {
    const protocol = i <= 4 ? "http" : i <= 7 ? "mqtt" : "ws";
    const name = `sim-${protocol}-${String(i).padStart(3, "0")}`;

    try {
      // Önce mevcut cihazı ara
      const searchRes = await fetch(
        `${HTTP_URL}/api/device?search=${encodeURIComponent(name)}&limit=1`
      );
      const searchData = await searchRes.json();

      if (searchData.ok && searchData.data.length > 0) {
        const existing = searchData.data[0];
        console.log(`✅ Mevcut cihaz: ${name} (token: ${existing.accessToken})`);
        devices.push({ ...existing, protocol });
        continue;
      }

      // Yoksa oluştur
      const createRes = await fetch(`${HTTP_URL}/api/device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          profile: "default",
          tag: `simulator-${protocol}`,
          description: `Simülatör cihazı (${protocol.toUpperCase()})`,
        }),
      });

      const createData = await createRes.json();
      if (createData.ok) {
        console.log(`🆕 Yeni cihaz: ${name} (token: ${createData.data.accessToken})`);
        devices.push({ ...createData.data, protocol });
      } else {
        console.error(`❌ ${name} oluşturulamadı:`, createData.message);
      }
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
      wsClients.set(device._id, ws);
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
  const ws = wsClients.get(device._id);
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

  // Cihazları oluştur/getir
  const devices = await ensureDevices();
  if (devices.length === 0) {
    console.error("❌ Hiç cihaz oluşturulamadı. Sunucu çalışıyor mu?");
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
    state[d._id] = {
      temperature: 20 + Math.random() * 10,
      humidity: 40 + Math.random() * 20,
    };
  }

  console.log("📊 Veri gönderimi başlıyor...\n");

  setInterval(() => {
    for (const device of devices) {
      const s = state[device._id];
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
