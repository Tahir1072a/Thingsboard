import net from "net";
import tls from "tls";
import fs from "fs";
import path from "path";
import logger from "../logger.js";
import { verifyDeviceToken, verifyDeviceCertificate, isServerCertExist } from "./auth.js";
import { ingestTelemetry } from "./telemetry-ingestion.js";
import { setupRpcHandlers } from "./rpc-handler.js";

export async function startMqttBroker({ MQTT_PORT, MQTTS_PORT, certsDir }) {
  const { Aedes } = await import("aedes");

  const aedesInstance = await Aedes.createBroker({
    authenticate(client, username, password, callback) {
      // ─── Yol 1: TLS Sertifika ile doğrulama (mTLS) ───
      if (client.conn && client.conn.getPeerCertificate) {
        const peerCert = client.conn.getPeerCertificate(true);
        if (peerCert && peerCert.fingerprint256) {
          const fingerprint = peerCert.fingerprint256.replace(/:/g, "").toLowerCase();
          logger.info({ fingerprint }, "Gelen cihaz parmak izi:");
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
              client.tenantId = device.tenantId ? device.tenantId.toString() : null;
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
          client.tenantId = device.tenantId ? device.tenantId.toString() : null;
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

  let mqttServer;
  let mqttsServer;

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

  // ─── RPC Event Listeners ───
  setupRpcHandlers(aedesInstance);

  aedesInstance.on("client", (client) => {
    logger.info({ clientId: client.id, device: client.deviceName || "?" }, "MQTT bağlantı");
  });

  aedesInstance.on("clientDisconnect", (client) => {
    logger.info({ clientId: client.id }, "MQTT kopma");
  });

  aedesInstance.on("publish", async (packet, client) => {
    if (!client) return;
    if (!client.deviceId) return;

    // ── Attribute topic desteği: v1/devices/me/attributes ──
    if (packet.topic === "v1/devices/me/attributes") {
      try {
        const raw = packet.payload.toString();
        const body = JSON.parse(raw);

        if (typeof body === "object" && Object.keys(body).length > 0) {
          const { default: connectDB } = await import("../db.js");
          const { default: Attribute } = await import("../../models/Attribute.js");
          const { emit } = await import("../event-emitter.js");

          await connectDB();
          await Attribute.upsertMany(
            client.tenantId,
            client.deviceId,
            "CLIENT_SCOPE",
            body
          );

          emit("attribute", {
            tenantId: client.tenantId,
            deviceId: client.deviceId,
            scope: "CLIENT_SCOPE",
            attributes: body,
          });

          logger.info({ deviceId: client.deviceId, keys: Object.keys(body) }, "MQTT client attribute kaydedildi");
        }
      } catch (err) {
        logger.error({ err }, "MQTT attribute parse hatası");
      }
      return;
    }

    // ── RPC yanıt topic'i: v1/devices/me/rpc/response/{requestId} ──
    if (packet.topic.startsWith("v1/devices/me/rpc/response/")) {
      try {
        const requestId = packet.topic.split("/").pop();
        const raw = packet.payload.toString();
        const body = JSON.parse(raw);

        const { default: connectDB } = await import("../db.js");
        const { default: RpcRequest } = await import("../../models/RpcRequest.js");

        await connectDB();
        const rpc = await RpcRequest.findOne({ requestId, deviceId: client.deviceId });
        if (rpc && (rpc.status === "PENDING" || rpc.status === "DELIVERED")) {
          rpc.status = body.error ? "ERROR" : "SUCCESS";
          rpc.response = body.response || body.result || null;
          rpc.errorMessage = body.error || "";
          rpc.completedAt = new Date();
          await rpc.save();
          logger.info({ requestId, deviceId: client.deviceId }, "MQTT RPC yanıtı alındı");
        }
      } catch (err) {
        logger.error({ err }, "MQTT RPC yanıt parse hatası");
      }
      return;
    }

    // ── Client-Side RPC: Cihazdan gelen RPC isteği ──
    if (packet.topic.startsWith("v1/devices/me/rpc/request/") && !packet.topic.includes("response")) {
      try {
        const requestId = packet.topic.split("/").pop();
        const raw = packet.payload.toString();
        const body = JSON.parse(raw);

        const { default: connectDB } = await import("../db.js");
        const { default: RpcRequest } = await import("../../models/RpcRequest.js");

        await connectDB();

        // Client-side RPC kaydını oluştur
        const rpc = await RpcRequest.create({
          tenantId: client.tenantId,
          deviceId: client.deviceId,
          requestId: `csrpc_${requestId}`,
          direction: "DEVICE_TO_SERVER",
          method: body.method || "unknown",
          params: body.params || {},
          status: "PENDING",
        });

        logger.info({ requestId, method: body.method, deviceId: client.deviceId }, "Client-Side RPC alındı");
      } catch (err) {
        logger.error({ err }, "Client-Side RPC parse hatası");
      }
      return;
    }

    // ── Telemetri topic'leri: devices/{id}/telemetry/... ──
    if (!packet.topic.startsWith("devices/")) return;

    try {
      const raw = packet.payload.toString();
      const body = JSON.parse(raw);
      const topicParts = packet.topic.split("/");
      const topicKey = topicParts[3] ?? null;

      const items = [];

      if (body.key && body.value !== undefined) {
        items.push({ deviceId: client.deviceId, userId: client.userId, tenantId: client.tenantId, key: body.key, value: body.value, unit: body.unit, protocol: "mqtt" });
      } else if (topicKey && body.value !== undefined) {
        items.push({ deviceId: client.deviceId, userId: client.userId, tenantId: client.tenantId, key: topicKey, value: body.value, unit: body.unit, protocol: "mqtt" });
      } else {
        Object.entries(body)
          .filter(([k]) => k !== "deviceId" && k !== "accessToken")
          .forEach(([key, value]) => {
            items.push({ deviceId: client.deviceId, userId: client.userId, tenantId: client.tenantId, key, value, protocol: "mqtt" });
          });
      }

      await ingestTelemetry(items);
    } catch (err) {
      logger.error({ err }, "MQTT mesaj parse hatası");
    }
  });

  return { aedesInstance, mqttServer, mqttsServer };
}
