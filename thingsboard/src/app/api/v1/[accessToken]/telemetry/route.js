/**
 * /api/v1/[accessToken]/telemetry — ThingsBoard Uyumlu HTTP Telemetri Ucu
 *
 * ThingsBoard'un standart HTTP API formatını destekler:
 *   POST /api/v1/{accessToken}/telemetry
 *   Body: { "temperature": 25.4, "humidity": 60 }
 *   veya: { "key": "temperature", "value": 25.4 }
 *   veya: { "metrics": [{ "key": "temperature", "value": 25.4 }] }
 *
 * Access token URL parametresinden okunur, header'a gerek yoktur.
 * İç işleyiş mevcut handleTelemetry fonksiyonu ile birebir aynıdır.
 */

import { NextResponse } from "next/server";
import { handleTelemetry, authenticateDevice } from "@/lib/telemetry-handler";

// ------------------------------------------------------------------ //
// POST — Standart telemetri formatı
// ------------------------------------------------------------------ //
export async function POST(request, { params }) {
  try {
    const { accessToken } = await params;

    // Cihaz doğrulama — token geçersizse hata fırlatır
    const device = await authenticateDevice(accessToken);
    const deviceId = device._id.toString();
    const userId = device.userId?.toString();
    const tenantId = device.tenantId?.toString();

    const body = await request.json();

    // Format 1: { "metrics": [{ "key": "temperature", "value": 25.4 }] }
    if (body.metrics && Array.isArray(body.metrics)) {
      const results = [];
      for (const metric of body.metrics) {
        const doc = await handleTelemetry({
          deviceId,
          userId,
          tenantId,
          key: metric.key,
          value: metric.value,
          unit: metric.unit ?? null,
          protocol: "http",
          timestamp: body.timestamp,
        });
        results.push(doc);
      }
      return NextResponse.json({ ok: true, data: results }, { status: 201 });
    }

    // ── Format 2: { key, value, unit? } ──
    if (body.key !== undefined && body.value !== undefined) {
      const doc = await handleTelemetry({
        deviceId,
        userId,
        tenantId,
        key: body.key,
        value: body.value,
        unit: body.unit ?? null,
        protocol: "http",
        timestamp: body.timestamp,
      });
      return NextResponse.json({ ok: true, data: doc }, { status: 201 });
    }

    // ── Format 3: ThingsBoard standart flat format ──
    // { "temperature": 25.4, "humidity": 60 }
    const results = [];
    const reservedKeys = new Set(["timestamp", "accessToken"]);
    for (const [key, value] of Object.entries(body)) {
      if (reservedKeys.has(key)) continue;
      const doc = await handleTelemetry({
        deviceId,
        userId,
        tenantId,
        key,
        value,
        protocol: "http",
        timestamp: body.timestamp,
      });
      results.push(doc);
    }

    if (results.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Geçerli telemetri verisi bulunamadı." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: true, data: results.length === 1 ? results[0] : results },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/v1/:token/telemetry]", error.message);

    const isAuthError =
      error.message.includes("Access token") ||
      error.message.includes("Geçersiz") ||
      error.message.includes("devre dışı") ||
      error.message.includes("zorunludur");

    return NextResponse.json(
      { ok: false, message: error.message },
      { status: isAuthError ? 401 : 400 }
    );
  }
}
