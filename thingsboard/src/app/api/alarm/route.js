/**
 * /api/alarm — Alarm listeleme ve durum güncelleme
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Alarm from "@/models/Alarm";

// GET — Alarmları listele
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || ""; // ACTIVE, CLEARED, ACKNOWLEDGED
    const severity = searchParams.get("severity") || "";
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const [data, total] = await Promise.all([
      Alarm.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Alarm.countDocuments(filter),
    ]);

    // Aktif alarm sayısı (header badge için)
    const activeCount = await Alarm.countDocuments({ status: "ACTIVE" });

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
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

// PUT — Alarm durumunu güncelle (acknowledge / clear)
export async function PUT(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { alarmId, action } = body; // action: "acknowledge" | "clear"

    if (!alarmId || !action) {
      return NextResponse.json(
        { ok: false, message: "alarmId ve action zorunludur." },
        { status: 400 }
      );
    }

    const alarm = await Alarm.findById(alarmId);
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

    return NextResponse.json({
      ok: true,
      message: `Alarm ${action === "acknowledge" ? "onaylandı" : "temizlendi"}.`,
      data: alarm.toObject(),
    });
  } catch (error) {
    console.error("[PUT /api/alarm]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
