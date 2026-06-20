import connectDB from "../../../db.js";
import Alarm from "../../../../models/Alarm.js";
import emitter from "../../../event-emitter.js";
import { processNotifications } from "../../../notification-service.js";

export async function clearAlarm(msg, config) {
  try {
    if (!config.alarmType) return { success: false, msg };
    await connectDB();
    const alarm = await Alarm.findOne({
      deviceId: msg.originatorId,
      type: config.alarmType,
      status: { $in: ["ACTIVE", "ACKNOWLEDGED"] },
    });
    if (!alarm) return { success: true, msg };
    alarm.status = "CLEARED";
    alarm.clearedAt = new Date();
    await alarm.save();
    emitter.emit("alarm", alarm.toObject());
    processNotifications("ALARM_CLEARED", {
      tenantId: msg.metadata.tenantId?.toString(),
      deviceId: msg.originatorId?.toString(),
      deviceName: msg.metadata.deviceName || "",
      alarmType: config.alarmType,
      severity: alarm.severity,
      status: "CLEARED",
      details: { clearedAt: alarm.clearedAt },
      timestamp: new Date().toISOString(),
    }).catch(() => {});
    console.log(`[clear-alarm] ${config.alarmType} temizlendi`);
    return { success: true, msg };
  } catch (err) {
    console.error("[clear-alarm] Hata:", err.message);
    return { success: false, msg };
  }
}
