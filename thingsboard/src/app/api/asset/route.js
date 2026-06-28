/**
 * /api/asset — Asset (Varlık) CRUD
 *
 * GET  — Tenant'ın asset listesi (sayfalı, filtrelenebilir)
 * POST — Yeni asset oluştur
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Asset from "@/models/Asset";
import { getSessionUser } from "@/lib/getSessionUser";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { escapeRegex } from "@/lib/utils/escapeRegex";

export async function GET(request) {
  try {
    const rateLimitResponse = await rateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) return rateLimitResponse;

    const { tenantId } = await getSessionUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    await connectDB();

    const filter = { tenantId };
    if (type) filter.type = type;
    if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };

    const total = await Asset.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;

    const data = await Asset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      ok: true,
      data,
      pagination: { total, page, totalPages, limit },
    });
  } catch (error) {
    console.error("[GET /api/asset]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const rateLimitResponse = await rateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) return rateLimitResponse;

    const { tenantId, canWrite } = await getSessionUser();
    if (!canWrite) {
      return NextResponse.json({ ok: false, message: "Bu işlem için yetkiniz yok." }, { status: 403 });
    }
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { ok: false, message: "Varlık adı zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    const asset = await Asset.create({
      tenantId,
      name: body.name,
      type: body.type || "CUSTOM",
      label: body.label || "",
      description: body.description || "",
      polygon: body.polygon || [],
      zoneConfig: body.zoneConfig || {},
      relations: body.relations || [],
      additionalInfo: body.additionalInfo || {},
    });

    return NextResponse.json({ ok: true, data: asset }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { ok: false, message: "Bu isimde bir varlık zaten mevcut." },
        { status: 409 }
      );
    }
    console.error("[POST /api/asset]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
