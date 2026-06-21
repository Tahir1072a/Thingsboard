/**
 * /api/notification-rule — Bildirim Kuralları CRUD
 *
 * GET  — Tenant'a ait tüm kuralları listele
 * POST — Yeni kural oluştur
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NotificationRule from "@/models/NotificationRule";
import { getSessionUser } from "@/lib/getSessionUser";

// ------------------------------------------------------------------ //
// GET — Kuralları listele
// ------------------------------------------------------------------ //
export async function GET(request) {
  try {
    const { userId, tenantId } = await getSessionUser();

    await connectDB();

    const searchParams = new URL(request.url).searchParams;
    const search = searchParams.get("search") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    const filter = { tenantId };
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const [data, total] = await Promise.all([
      NotificationRule.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationRule.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("[GET /api/notification-rule]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}

// ------------------------------------------------------------------ //
// POST — Yeni kural oluştur
// ------------------------------------------------------------------ //
export async function POST(request) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { ok: false, message: "Kural adı zorunludur." },
        { status: 400 }
      );
    }

    if (!body.trigger?.type) {
      return NextResponse.json(
        { ok: false, message: "Tetikleme tipi zorunludur." },
        { status: 400 }
      );
    }

    if (!body.channels || body.channels.length === 0) {
      return NextResponse.json(
        { ok: false, message: "En az bir bildirim kanalı gereklidir." },
        { status: 400 }
      );
    }

    await connectDB();

    const rule = await NotificationRule.create({
      tenantId,
      name: body.name,
      enabled: body.enabled !== false,
      trigger: body.trigger,
      channels: body.channels,
      template: body.template || {},
    });

    return NextResponse.json(
      { ok: true, data: rule },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/notification-rule]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}
