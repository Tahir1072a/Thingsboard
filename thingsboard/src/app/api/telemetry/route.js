/**
 * /api/telemetry — HTTP REST alım ve geçmiş sorgu ucu
 *
 * POST /api/telemetry
 *   Header: X-Access-Token: <device_token>
 *   Body: { key, value, unit?, timestamp? }
 *   veya çoklu: { metrics: [ { key, value, unit? }, ... ] }
 *
 *   NOT: deviceId artık body'den değil, access token'dan çözümlenir.
 *
 * GET /api/telemetry?deviceId=...&key=...&from=...&to=...&limit=...
 *   Tarih aralığı veya son N kayıt döner.
 */

import { NextResponse } from "next/server";
import { handleTelemetry, authenticateDevice } from "@/lib/telemetry-handler";
import connectDB from "@/lib/db";
import Telemetry from "@/models/Telemetry";

// ------------------------------------------------------------------ //
// POST — Veri alımı (access token zorunlu)
// ------------------------------------------------------------------ //
export async function POST(request) {
  try {
    // Access token'ı header'dan oku
    const accessToken = request.headers.get("x-access-token");

    // Cihaz doğrulama — token geçersizse hata fırlatır
    const device = await authenticateDevice(accessToken);
    const deviceId = device._id.toString();

    const body = await request.json();

    // Çoklu metrik desteği: { metrics: [{ key, value, unit }] }
    if (body.metrics && Array.isArray(body.metrics)) {
      const results = [];
      for (const metric of body.metrics) {
        const doc = await handleTelemetry({
          deviceId,
          key: metric.key,
          value: metric.value,
          unit: metric.unit,
          protocol: "http",
          timestamp: body.timestamp,
        });
        results.push(doc);
      }
      return NextResponse.json({ ok: true, data: results }, { status: 201 });
    }

    // Tekil metrik: { key, value, unit?, timestamp? }
    const doc = await handleTelemetry({
      deviceId,
      key: body.key,
      value: body.value,
      unit: body.unit,
      protocol: "http",
      timestamp: body.timestamp,
    });

    return NextResponse.json({ ok: true, data: doc }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/telemetry]", error.message);

    const isAuthError =
      error.message.includes("Access token") ||
      error.message.includes("Geçersiz") ||
      error.message.includes("devre dışı");

    return NextResponse.json(
      { ok: false, message: error.message },
      { status: isAuthError ? 401 : 400 }
    );
  }
}

// ------------------------------------------------------------------ //
// GET — Geçmiş veri sorgusu
// ------------------------------------------------------------------ //
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const deviceId = searchParams.get("deviceId");
    const key = searchParams.get("key");
    const from = searchParams.get("from"); // ISO8601
    const to = searchParams.get("to");     // ISO8601
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 5000);

    if (!deviceId) {
      return NextResponse.json(
        { ok: false, message: "deviceId parametresi zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    const filter = { deviceId };
    if (key) filter.key = key;

    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const docs = await Telemetry.find(filter)
      .sort({ timestamp: from ? 1 : -1 })
      .limit(limit)
      .lean();

    const data = from ? docs : docs.reverse();

    return NextResponse.json({
      ok: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("[GET /api/telemetry]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
