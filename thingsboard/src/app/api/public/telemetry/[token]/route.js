/**
 * /api/public/telemetry/[token] — Public telemetri sorgusu
 *
 * GET → Auth gerektirmez. publicToken üzerinden panoyu bulur,
 *       deviceId ve key parametrelerini pano widget'larına karşı doğrular,
 *       ardından telemetri verisini döner.
 *
 * Query params: deviceId, key, latest, limit, from, to
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Dashboard from "@/models/Dashboard";
import Telemetry from "@/models/Telemetry";

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);

    const deviceId = searchParams.get("deviceId");
    const key = searchParams.get("key");
    const latest = searchParams.get("latest");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 5000);

    if (!deviceId) {
      return NextResponse.json(
        { ok: false, message: "deviceId parametresi zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    // Pano bul
    const dashboard = await Dashboard.findOne({
      publicToken: token,
      isPublic: true,
    }).lean();

    if (!dashboard) {
      return NextResponse.json(
        { ok: false, message: "Pano bulunamadı veya paylaşım kapalı." },
        { status: 404 }
      );
    }

    // Süre kontrolü
    if (
      dashboard.shareSettings?.expiresAt &&
      new Date(dashboard.shareSettings.expiresAt) < new Date()
    ) {
      return NextResponse.json(
        { ok: false, message: "Bu paylaşım bağlantısının süresi dolmuş." },
        { status: 410 }
      );
    }

    // ── Güvenlik: deviceId pano widget'larında var mı? ──
    const allowedDeviceIds = new Set();
    const allowedKeys = new Set();

    (dashboard.widgets || []).forEach((widget) => {
      (widget.devices || []).forEach((d) => {
        if (d.id) allowedDeviceIds.add(d.id);
      });
      (widget.keys || []).forEach((k) => {
        allowedKeys.add(k);
      });
      // image_map marker'larındaki cihazları da dahil et
      if (widget.config?.markers) {
        widget.config.markers.forEach((m) => {
          if (m.deviceId) allowedDeviceIds.add(m.deviceId);
          if (m.telemetryKey) allowedKeys.add(m.telemetryKey);
        });
      }
    });

    if (!allowedDeviceIds.has(deviceId)) {
      return NextResponse.json(
        { ok: false, message: "Bu cihaza erişim izniniz yok." },
        { status: 403 }
      );
    }

    if (key && !allowedKeys.has(key)) {
      return NextResponse.json(
        { ok: false, message: "Bu telemetri key'ine erişim izniniz yok." },
        { status: 403 }
      );
    }

    // ── Telemetri sorgulama (ana /api/telemetry GET mantığı ile aynı) ──
    const filter = { deviceId };
    if (key) filter.key = key;

    // latest=true: Her benzersiz key için son değer
    if (latest === "true") {
      const pipeline = [
        { $match: { deviceId: dashboard.widgets[0]?.devices?.[0]?.id ? { $in: Array.from(allowedDeviceIds).map(id => { try { const mongoose = require("mongoose"); return new mongoose.Types.ObjectId(id); } catch { return id; } }) } : deviceId } },
      ];

      // Basit latest sorgusu — deviceId'ye göre
      const matchFilter = { deviceId };
      try {
        const mongoose = (await import("mongoose")).default;
        matchFilter.deviceId = new mongoose.Types.ObjectId(deviceId);
      } catch {
        // String olarak bırak
      }

      const latestPipeline = [
        { $match: matchFilter },
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

      const results = await Telemetry.aggregate(latestPipeline);
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

    // ── Aggregation modu ──
    const agg = searchParams.get("agg");
    const interval = searchParams.get("interval");
    const startTs = searchParams.get("startTs");
    const endTs = searchParams.get("endTs");

    const VALID_AGG = ["AVG", "MIN", "MAX", "SUM", "COUNT"];
    if (agg && VALID_AGG.includes(agg.toUpperCase())) {
      const aggUpper = agg.toUpperCase();
      const intervalMs = parseInt(interval) || 3600000;

      let objDeviceId;
      try {
        const mongoose = (await import("mongoose")).default;
        objDeviceId = new mongoose.Types.ObjectId(deviceId);
      } catch {
        objDeviceId = deviceId;
      }

      const timeFrom = startTs
        ? new Date(parseInt(startTs))
        : from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const timeTo = endTs
        ? new Date(parseInt(endTs))
        : to ? new Date(to) : new Date();

      const matchFilter = {
        deviceId: objDeviceId,
        timestamp: { $gte: timeFrom, $lte: timeTo },
      };
      if (key) matchFilter.key = key;

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

    // Tarih aralığı filtresi
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    // deviceId'yi ObjectId'ye dönüştür
    try {
      const mongoose = (await import("mongoose")).default;
      filter.deviceId = new mongoose.Types.ObjectId(deviceId);
    } catch {
      // String olarak bırak
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
    console.error("[GET /api/public/telemetry/:token]", error);
    return NextResponse.json(
      { ok: false, message: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
