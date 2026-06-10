/**
 * /api/telemetry/keys — Cihaza ait benzersiz telemetri key'lerini döndürür
 *
 * GET /api/telemetry/keys?deviceId=...
 * Cevap: { ok: true, keys: ["temperature", "humidity", "x", ...] }
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Telemetry from "@/models/Telemetry";
import Device from "@/models/Device";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(request) {
  try {
    const userId = await getSessionUser();
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { ok: false, message: "deviceId parametresi zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    // Cihazın bu kullanıcıya ait olduğunu doğrula
    const device = await Device.findOne({ _id: deviceId, userId }).lean();
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Cihaz bulunamadı veya erişim yetkiniz yok." },
        { status: 403 }
      );
    }

    // Bu cihaza ait benzersiz key'leri çek
    const keys = await Telemetry.distinct("key", { deviceId, userId });

    return NextResponse.json({ ok: true, keys });
  } catch (error) {
    console.error("[GET /api/telemetry/keys]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
