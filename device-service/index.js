import "dotenv/config";

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/lib/db.js";
import { startMQTTServer } from "./src/mqtt/server.js";

import deviceRouter from "./src/modules/device-management/routes/device.router.js";
import deviceProfileRouter from "./src/modules/device-management/routes/deviceProfile.router.js";
import telemetryRouter from "./src/modules/telemetry/routes/telemetry.router.js";

import globalErrorHandler from "./src/middleware/errorHandler.js";
import AppError from "./src/utilts/AppError.js";

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.get("/", (req, res) => {
  res.send("Device Servisi Çalışıyor.");
});

app.use("/api/device", deviceRouter);
app.use("/api/device-profile", deviceProfileRouter);
app.use("/api/v1", telemetryRouter);

app.use((req, res, next) => {
  next(new AppError(`Bu url bulunamadı: ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

const PORT = process.env.PORT || 4002;
const startServer = async () => {
  try {
    await connectDB();

    // 1. HTTP Sunucusu
    app.listen(PORT, () => {
      console.log("🌍 HTTP Server 4002 portunda çalışıyor");
    });

    // 2. MQTT Sunucusu
    startMQTTServer(1884);
  } catch (error) {
    console.error("Başlatma Hatası:", error);
  }
};

startServer();
