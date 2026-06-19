/**
 * /api/v1/[accessToken]/attributes — Cihaz tarafı Attribute API
 *
 * POST  — Cihaz client-side attribute gönderir
 *         Body: { key: value, ... }
 *
 * GET   — Cihaz shared attribute'ları okur
 *         ?sharedKeys=key1,key2
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Device from "@/models/Device";
import Attribute from "@/models/Attribute";
import { emit } from "@/lib/event-emitter";

// ------------------------------------------------------------------ //
// POST — Cihaz client-side attribute gönderir
// Body: { "firmwareVersion": "v2.3.1", "ipAddress": "192.168.1.105" }
// ------------------------------------------------------------------ //
export async function POST(request, { params }) {
  try {
    const { accessToken } = await params;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Access token zorunludur." },
        { status: 401 }
      );
    }

    await connectDB();

    // Cihazı token ile bul
    const device = await Device.findByToken(accessToken);
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Geçersiz access token." },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return NextResponse.json(
        { ok: false, message: "En az bir attribute key-value çifti gönderilmelidir." },
        { status: 400 }
      );
    }

    const deviceId = device._id.toString();
    const tenantId = device.tenantId?.toString();

    // Client-side attribute'ları upsert et
    const result = await Attribute.upsertMany(
      tenantId,
      deviceId,
      "CLIENT_SCOPE",
      body
    );

    // SSE üzerinden bildir
    emit("attribute", {
      tenantId,
      deviceId,
      scope: "CLIENT_SCOPE",
      attributes: body,
    });

    return NextResponse.json({
      ok: true,
      message: `${Object.keys(body).length} client attribute güncellendi.`,
    });
  } catch (error) {
    console.error("[POST /api/v1/:token/attributes]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------ //
// GET — Cihaz shared attribute'ları okur
// ?sharedKeys=targetTemperature,operationMode
// ------------------------------------------------------------------ //
export async function GET(request, { params }) {
  try {
    const { accessToken } = await params;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Access token zorunludur." },
        { status: 401 }
      );
    }

    await connectDB();

    const device = await Device.findByToken(accessToken);
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Geçersiz access token." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sharedKeys = searchParams.get("sharedKeys");

    const deviceId = device._id.toString();

    // Shared attribute'ları getir
    let filter = { deviceId, scope: "SHARED_SCOPE" };

    if (sharedKeys) {
      const keyList = sharedKeys.split(",").map((k) => k.trim()).filter(Boolean);
      if (keyList.length > 0) {
        filter.key = { $in: keyList };
      }
    }

    const attributes = await Attribute.find(filter).sort({ key: 1 }).lean();

    // Cihaz dostu format: { key: value, ... }
    const result = {};
    attributes.forEach((attr) => {
      result[attr.key] = attr.value;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/v1/:token/attributes]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
