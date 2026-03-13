import aedes from "aedes";
import net from "net";
import { getDeviceByToken } from "../modules/device-management/services/device.service.js";
import { handleTelemetry } from "./handlers/telemetryHandler.js";

const broker = aedes();
const server = net.createServer(broker.handle);

// --- 1. KİMLİK DOĞRULAMA (AUTHENTICATION) ---
broker.authenticate = async (client, username, password, callback) => {
  const token = username;

  if (!token) {
    const error = new Error("Auth error: Token gerekli");
    error.returnCode = 4;
    return callback(error, null);
  }

  try {
    const device = await getDeviceByToken(token);

    if (device) {
      client.device = device;

      client.id = token;
      callback(null, true);
    } else {
      const error = new Error("Auth error: Geçersiz Token");
      error.returnCode = 4;
      callback(error, null);
    }
  } catch (err) {
    console.error("MQTT Auth Hatası:", err);
    callback(err, null);
  }
};

// --- 2. MESAJ YÖNLENDİRME (ROUTING) ---
broker.on("publish", async (packet, client) => {
  if (client && client.device) {
    const topic = packet.topic;

    // Telemetri Topic Kontrolü (ThingsBoard stili)
    if (topic === "v1/devices/me/telemetry") {
      await handleTelemetry(topic, packet.payload, client);
    }

    // İleride buraya RPC veya Attributes handler'ları ekleyebilirsin
    // else if (topic === "v1/devices/me/attributes") { ... }
  }
});

export function startMQTTServer(port = 1883) {
  server.listen(port, () => {
    console.log(`📡 MQTT Broker çalışıyor: Port ${port}`);
  });
}
