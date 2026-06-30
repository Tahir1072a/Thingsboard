import { WebSocketServer } from "ws";
import tls from "tls";
import fs from "fs";
import path from "path";
import logger from "../logger.js";
import { verifyDeviceToken, verifyDeviceCertificate, isServerCertExist } from "./auth.js";
import { ingestTelemetry } from "./telemetry-ingestion.js";

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
        var tenantIdWs = device.tenantId ? device.tenantId.toString() : null;
      }

      if (!body.key || body.value === undefined) {
        ws.send(JSON.stringify({ error: "key ve value alanları zorunludur." }));
        return;
      }

      await ingestTelemetry([{
        deviceId,
        userId,
        tenantId: tenantIdWs || ws.tenantId || null,
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
// Sunucuları Başlat
// ------------------------------------------------------------------ //
export function startWsServer({ WS_PORT, WSS_PORT, certsDir }) {
  // ── WebSocket Sunucusu — port 3001 ──
  const wsServer = new WebSocketServer({ port: WS_PORT }, () => {
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

  let wssServer;

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

  return { wsServer, wssServer };
}
