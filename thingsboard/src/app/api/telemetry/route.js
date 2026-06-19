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
import Device from "@/models/Device";
import { getSessionUser } from "@/lib/getSessionUser";

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
    const userId = device.userId?.toString();

    const body = await request.json();

    // Çoklu metrik desteği: { metrics: [{ key, value, unit }] }
    if (body.metrics && Array.isArray(body.metrics)) {
      const results = [];
      for (const metric of body.metrics) {
        const doc = await handleTelemetry({
          deviceId,
          userId,
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
      userId,
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
// GET — Geçmiş veri sorgusu (session auth ile user kontrolü)
// ------------------------------------------------------------------ //
export async function GET(request) {
  try {
    const { userId } = await getSessionUser();

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

    // Cihazın bu kullanıcıya ait olduğunu doğrula
    const device = await Device.findOne({ _id: deviceId, userId }).lean();
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Cihaz bulunamadı veya erişim yetkiniz yok." },
        { status: 403 }
      );
    }

    const filter = { deviceId, userId };
    if (key) filter.key = key;

    // ── latest=true: Her benzersiz key için son değeri döndür ──
    const latest = searchParams.get("latest");
    if (latest === "true") {
      const pipeline = [
        { $match: { deviceId: device._id, userId: device.userId } },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: "$key",
            key: { $first: "$key" },
            value: { $first: "$value" },
            valueType: { $first: "$valueType" },
            unit: { $first: "$unit" },
            timestamp: { $first: "$timestamp" },
            protocol: { $first: "$protocol" },
            docId: { $first: "$_id" },
          },
        },
        { $sort: { key: 1 } },
      ];

      const results = await Telemetry.aggregate(pipeline);
      return NextResponse.json({
        ok: true,
        count: results.length,
        data: results.map((r) => ({
          _id: r.docId,
          key: r.key,
          value: r.value,
          valueType: r.valueType,
          unit: r.unit,
          timestamp: r.timestamp,
          protocol: r.protocol,
        })),
      });
    }

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
      { status: error.statusCode || 500 }
    );
  }
}
