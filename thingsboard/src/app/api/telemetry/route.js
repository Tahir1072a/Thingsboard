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
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ------------------------------------------------------------------ //
// POST — Veri alımı (access token zorunlu)
// ------------------------------------------------------------------ //
export async function POST(request) {
  try {
    const rateLimitResponse = await rateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) return rateLimitResponse;

    // Access token'ı header'dan oku
    const accessToken = request.headers.get("x-access-token");

    // Cihaz doğrulama — token geçersizse hata fırlatır
    const device = await authenticateDevice(accessToken);
    const deviceId = device._id.toString();
    const userId = device.userId?.toString();
    const tenantId = device.tenantId?.toString();

    const body = await request.json();

    // Çoklu metrik desteği: { metrics: [{ key, value, unit }] }
    if (body.metrics && Array.isArray(body.metrics)) {
      const results = [];
      for (const metric of body.metrics) {
        const doc = await handleTelemetry({
          deviceId,
          userId,
          tenantId,
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
      tenantId,
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
//
// Aggregation desteği:
//   ?agg=AVG|MIN|MAX|SUM|COUNT  — Toplama fonksiyonu
//   &interval=3600000           — Gruplama aralığı (ms)
//   &startTs=1709900000000      — Başlangıç (epoch ms)
//   &endTs=1709999999999        — Bitiş (epoch ms)
//
// Aggregation kullanılmadığında mevcut davranış korunur.
// ------------------------------------------------------------------ //
export async function GET(request) {
  try {
    const rateLimitResponse = await rateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) return rateLimitResponse;

    const { userId, tenantId } = await getSessionUser();

    const { searchParams } = new URL(request.url);

    const deviceId = searchParams.get("deviceId");
    const key = searchParams.get("key");
    const from = searchParams.get("from"); // ISO8601
    const to = searchParams.get("to");     // ISO8601
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 5000);

    // Aggregation parametreleri
    const agg = searchParams.get("agg"); // AVG, MIN, MAX, SUM, COUNT, NONE
    const interval = searchParams.get("interval"); // ms cinsinden gruplama aralığı
    const startTs = searchParams.get("startTs"); // epoch ms
    const endTs = searchParams.get("endTs"); // epoch ms

    if (!deviceId) {
      return NextResponse.json(
        { ok: false, message: "deviceId parametresi zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    // Cihazın bu tenant'a ait olduğunu doğrula
    const device = await Device.findOne({ _id: deviceId, tenantId }).lean();
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Cihaz bulunamadı veya erişim yetkiniz yok." },
        { status: 403 }
      );
    }

    const filter = { deviceId, tenantId };
    if (key) filter.key = key;

    // ── latest=true: Her benzersiz key için son değeri döndür ──
    const latest = searchParams.get("latest");
    if (latest === "true") {
      const pipeline = [
        { $match: { deviceId: device._id, tenantId: device.tenantId } },
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

    // ── Aggregation modu (agg != null ve NONE değilse) ──
    const VALID_AGG = ["AVG", "MIN", "MAX", "SUM", "COUNT"];
    if (agg && VALID_AGG.includes(agg.toUpperCase())) {
      const aggUpper = agg.toUpperCase();
      const intervalMs = parseInt(interval) || 3600000; // default: 1 saat

      // Zaman aralığı belirleme
      const timeFrom = startTs
        ? new Date(parseInt(startTs))
        : from
        ? new Date(from)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // default: son 24 saat

      const timeTo = endTs
        ? new Date(parseInt(endTs))
        : to
        ? new Date(to)
        : new Date();

      // Match filter — sadece numeric değerler aggregation'a dahil edilir
      const matchFilter = {
        deviceId: device._id,
        tenantId: device.tenantId,
        valueType: "number",
        timestamp: { $gte: timeFrom, $lte: timeTo },
      };
      if (key) matchFilter.key = key;

      // Aggregation group operatörleri
      const groupOps = {
        _id: {
          interval: {
            $subtract: [
              { $toLong: "$timestamp" },
              { $mod: [{ $toLong: "$timestamp" }, intervalMs] },
            ],
          },
          key: "$key",
        },
        key: { $first: "$key" },
        count: { $sum: 1 },
        avg: { $avg: { $toDouble: "$value" } },
        min: { $min: { $toDouble: "$value" } },
        max: { $max: { $toDouble: "$value" } },
        sum: { $sum: { $toDouble: "$value" } },
        unit: { $first: "$unit" },
      };

      // Sonuç olarak hangi değer dönsün
      const valueField = `$${aggUpper.toLowerCase()}`;

      const pipeline = [
        { $match: matchFilter },
        { $group: groupOps },
        { $sort: { "_id.interval": 1 } },
        {
          $project: {
            _id: 0,
            key: 1,
            value: valueField,
            count: 1,
            unit: 1,
            timestamp: { $toDate: "$_id.interval" },
          },
        },
      ];

      const results = await Telemetry.aggregate(pipeline);

      return NextResponse.json({
        ok: true,
        aggregation: aggUpper,
        interval: intervalMs,
        from: timeFrom.toISOString(),
        to: timeTo.toISOString(),
        count: results.length,
        data: results,
      });
    }

    // ── Normal mod (ham veri) ──
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

