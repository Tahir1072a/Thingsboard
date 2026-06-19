/**
 * /api/alarm — Alarm listeleme ve durum güncelleme
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Alarm from "@/models/Alarm";
import Device from "@/models/Device";
import { getSessionUser } from "@/lib/getSessionUser";
import { createAuditLog } from "@/lib/audit-service";

// GET — Alarmları listele (user-scoped)
export async function GET(request) {
  try {
    const userId = await getSessionUser();
    await connectDB();

    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get("status") || ""; // ACTIVE, CLEARED, ACKNOWLEDGED
    const severity = searchParams.get("severity") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");

    const filter = { userId };
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (deviceId) filter.deviceId = deviceId;
    
    if (search) {
      filter.$or = [
        { type: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { severity: { $regex: search, $options: "i" } },
        { "details.key": { $regex: search, $options: "i" } },
        { "details.threshold": { $regex: search, $options: "i" } }
      ];
    }

    const [data, total] = await Promise.all([
      Alarm.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alarm.countDocuments(filter),
    ]);

    // Aktif alarm sayısı (header badge için) — user-scoped
    const activeCount = await Alarm.countDocuments({ userId, status: "ACTIVE" });

    return NextResponse.json({
      ok: true,
      data,
      activeCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/alarm]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

// PUT — Alarm durumunu güncelle (acknowledge / clear)
export async function PUT(request) {
  try {
    const userId = await getSessionUser();
    await connectDB();
    const body = await request.json();
    const { alarmId, action } = body; // action: "acknowledge" | "clear"

    if (!alarmId || !action) {
      return NextResponse.json(
        { ok: false, message: "alarmId ve action zorunludur." },
        { status: 400 }
      );
    }

    // Alarm'ın bu kullanıcıya ait olduğunu doğrula
    const alarm = await Alarm.findOne({ _id: alarmId, userId });
    if (!alarm) {
      return NextResponse.json({ ok: false, message: "Alarm bulunamadı." }, { status: 404 });
    }

    if (action === "acknowledge") {
      alarm.status = "ACKNOWLEDGED";
    } else if (action === "clear") {
      alarm.status = "CLEARED";
      alarm.clearedAt = new Date();
    } else {
      return NextResponse.json({ ok: false, message: "Geçersiz action." }, { status: 400 });
    }

    await alarm.save();

    // Alarm süresini hesapla
    const alarmObj = alarm.toObject();
    const durationMs = alarm.clearedAt
      ? alarm.clearedAt.getTime() - (alarm.startTime || alarm.createdAt).getTime()
      : null;

    // Audit log — Alarm entity'si
    createAuditLog({
      userId,
      action: action === "acknowledge" ? "ALARM_ACKNOWLEDGE" : "ALARM_CLEAR",
      entityType: "ALARM",
      entityId: alarm._id,
      entityName: `${alarm.type} (${alarm.deviceName || ""})`,
      details: {
        severity: alarm.severity,
        ...(durationMs != null && { durationMs, duration: alarmObj.duration }),
      },
    });

    // Audit log — Cihaz entity'si (cihazın denetim günlüklerinde de gözüksün)
    if (alarm.deviceId) {
      createAuditLog({
        userId,
        action: action === "acknowledge" ? "ALARM_ACKNOWLEDGE" : "ALARM_CLEAR",
        entityType: "DEVICE",
        entityId: alarm.deviceId,
        entityName: alarm.deviceName || "",
        details: {
          alarmType: alarm.type,
          severity: alarm.severity,
          ...(durationMs != null && { durationMs, duration: alarmObj.duration }),
          reason: action === "clear"
            ? `"${alarm.type}" alarmı temizlendi. Aktif süre: ${alarmObj.duration || "bilinmiyor"}`
            : `"${alarm.type}" alarmı onaylandı.`,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Alarm ${action === "acknowledge" ? "onaylandı" : "temizlendi"}.`,
      data: alarm.toObject(),
    });
  } catch (error) {
    console.error("[PUT /api/alarm]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}
