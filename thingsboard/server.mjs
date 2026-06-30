/**
 * server.mjs — Custom Next.js Server (ESM)
 *
 * Bu dosya standart `next dev` / `next start` komutu yerine kullanılır.
 * Şunları aynı Node.js sürecinde çalıştırır:
 *   1. Next.js HTTP sunucusu
 *   2. aedes MQTT broker
 *   3. WebSocket sunucusu
 */

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import logger from "./src/lib/logger.js";
import { startMqttBroker } from "./src/lib/broker/mqtt-server.js";
import { startWsServer } from "./src/lib/broker/ws-server.js";

// ESM ortamında __dirname karşılığı
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
// Next.js HTTP Sunucusu Başlatma
// ------------------------------------------------------------------ //
async function startNextJs() {
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

  return new Promise((resolve) => {
    httpServer.listen(PORT, () => {
      logger.info(`Next.js sunucusu → http://${hostname}:${PORT}`);
      logger.info(`Ortam: ${dev ? "development" : "production"}`);
      resolve(httpServer);
    });
  });
}

// ------------------------------------------------------------------ //
// Tüm Sistemleri Başlat
// ------------------------------------------------------------------ //
async function main() {
  await connectMongo();

  const mqttInstances = await startMqttBroker({ MQTT_PORT, MQTTS_PORT, certsDir });
  aedesInstance = mqttInstances.aedesInstance;
  mqttServer = mqttInstances.mqttServer;
  mqttsServer = mqttInstances.mqttsServer;

  const wsInstances = startWsServer({ WS_PORT, WSS_PORT, certsDir });
  wsServer = wsInstances.wsServer;
  wssServer = wsInstances.wssServer;

  await startNextJs();
  
  logger.info("Tüm sistemler başarıyla başlatıldı! 🚀");
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

// ── uncaughtException / unhandledRejection ──
process.on("uncaughtException", (err) => {
  if (err.code === "MODULE_NOT_FOUND" && err.message?.includes("vendor-chunks")) return;
  if (err.message?.includes("worker thread exited")) return;
  logger.error({ err }, "uncaughtException (sunucu çalışmaya devam ediyor)");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandledRejection");
});

// Başlat
main().catch((err) => {
  logger.error({ err }, "Sunucu başlatma hatası");
  process.exit(1);
});

// Kapanış sinyallerini dinle
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
