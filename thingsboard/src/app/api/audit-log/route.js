/**
 * /api/audit-log — Denetim Günlüğü API Endpoint'i
 *
 * GET /api/audit-log?page=1&limit=20&action=DEVICE_CREATE&entityType=DEVICE&status=SUCCESS&from=...&to=...&search=...
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Sayfalama
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    // Filtreler
    const filter = { userId };

    // Aksiyon filtresi
    const action = searchParams.get("action");
    if (action) {
      // Wildcard desteği: "DEVICE_%" → DEVICE_ ile başlayan tüm aksiyonlar
      if (action.endsWith("%")) {
        const prefix = action.slice(0, -1);
        filter.action = { $regex: `^${prefix}`, $options: "i" };
      } else {
        filter.action = action;
      }
    }

    // Kaynak türü filtresi
    const entityType = searchParams.get("entityType");
    if (entityType) {
      filter.entityType = entityType;
    }

    // Sonuç filtresi
    const status = searchParams.get("status");
    if (status) {
      filter.status = status;
    }

    // Tarih aralığı filtresi
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    // Arama (entityName içinde)
    const search = searchParams.get("search");
    if (search) {
      filter.entityName = { $regex: search, $options: "i" };
    }

    // Sorgu
    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/audit-log] Hata:", error.message);
    return NextResponse.json(
      { ok: false, message: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
