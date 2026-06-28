/**
 * Create Alarm — Alarm oluştur
 * Config: { alarmType: "High Temperature", severity: "CRITICAL", condition: "temperature > 50" }
 * Uses existing Alarm model and alarm-engine evaluateCondition
 */
import connectDB from "../../../db.js";
import Alarm from "../../../../models/Alarm.js";
import emitter from "../../../event-emitter.js";
import { processNotifications } from "../../../notification-service.js";
import logger from "../../../logger.js";

export async function createAlarm(msg, config) {
  try {
    if (!config.alarmType) return { success: false, msg };
    
    await connectDB();
    
    // Check if condition is met (simple key-value check from msg)
    if (config.condition) {
      const condResult = evaluateSimpleCondition(config.condition, msg.msg);
      if (!condResult) return { success: true, msg }; // Condition not met, skip
    }
    
    // Check existing active alarm
    const existing = await Alarm.findOne({
      deviceId: msg.originatorId,
      type: config.alarmType,
      status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
    });
    
    if (existing) return { success: true, msg }; // Already active
    
    const alarm = await Alarm.create({
      tenantId: msg.metadata.tenantId,
      userId: msg.metadata.userId,
      deviceId: msg.originatorId,
      deviceName: msg.metadata.deviceName || "",
      type: config.alarmType,
      severity: config.severity || "MAJOR",
      status: "ACTIVE",
      source: "RULE_ENGINE",
      details: {
        triggeredBy: "rule-engine",
        values: msg.msg,
      },
    });
    
    emitter.emit("alarm", alarm.toObject());
    
    processNotifications("ALARM_CREATED", {
      tenantId: msg.metadata.tenantId?.toString(),
      deviceId: msg.originatorId?.toString(),
      deviceName: msg.metadata.deviceName || "",
      alarmType: config.alarmType,
      severity: config.severity || "MAJOR",
      status: "ACTIVE",
      details: msg.msg,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
    
    logger.info("[create-alarm] %s (%s)", config.alarmType, config.severity);
    return { success: true, msg };
  } catch (err) {
    logger.error({ err: err.message }, "[create-alarm] Hata");
    return { success: false, msg };
  }
}

function evaluateSimpleCondition(condition, values) {
  const match = condition.match(/^\s*(\w+)\s*(>=|<=|>|<|==|!=)\s*(.+?)\s*$/);
  if (!match) return false;
  const [, key, op, threshold] = match;
  const val = values[key];
  if (val === undefined) return false;
  const numThreshold = parseFloat(threshold);
  const numVal = parseFloat(val);
  if (isNaN(numVal) || isNaN(numThreshold)) {
    return op === "==" ? String(val) === threshold : String(val) !== threshold;
  }
  switch (op) {
    case ">": return numVal > numThreshold;
    case ">=": return numVal >= numThreshold;
    case "<": return numVal < numThreshold;
    case "<=": return numVal <= numThreshold;
    case "==": return numVal === numThreshold;
    case "!=": return numVal !== numThreshold;
    default: return false;
  }
}
