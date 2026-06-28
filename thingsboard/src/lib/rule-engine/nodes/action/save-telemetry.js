/**
 * Save Telemetry — Telemetri verilerini kaydet
 * Config: {} (msg.msg key-value çiftlerini kaydeder)
 * Uses the existing Telemetry model
 */
import connectDB from "../../../db.js";
import Telemetry from "../../../../models/Telemetry.js";
import logger from "../../../logger.js";

export async function saveTelemetry(msg, config) {
  try {
    await connectDB();
    const entries = Object.entries(msg.msg || {});
    for (const [key, value] of entries) {
      if (key === "ts" || key === "timestamp") continue;
      await Telemetry.create({
        tenantId: msg.metadata.tenantId,
        deviceId: msg.originatorId,
        key,
        value,
        valueType: typeof value === "number" ? "number" : "string",
        protocol: msg.metadata.protocol || "rule-engine",
        timestamp: msg.metadata.ts ? new Date(msg.metadata.ts) : new Date(),
      });
    }
    return { success: true, msg };
  } catch (err) {
    logger.error({ err: err.message }, "[save-telemetry] Hata");
    return { success: false, msg };
  }
}
