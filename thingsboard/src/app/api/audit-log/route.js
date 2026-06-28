/**
 * /api/audit-log — Denetim Günlüğü API Endpoint'i
 *
 * GET /api/audit-log?page=1&limit=20&action=DEVICE_CREATE&entityType=DEVICE&status=SUCCESS&from=...&to=...&search=...
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { getSessionUser } from "@/lib/getSessionUser";
import { canViewAuditLogs } from "@/lib/rbac";
import { escapeRegex } from "@/lib/utils/escapeRegex";

export async function GET(request) {
  try {
    const { userId, role, tenantId } = await getSessionUser();

    // Rol kontrolü — sadece SYSTEM_ADMIN, TENANT_ADMIN, OPERATOR görebilir (VIEWER göremez)
    if (!canViewAuditLogs(role)) {
      return NextResponse.json(
        { ok: false, message: "Bu işlem için yetkiniz yok." },
        { status: 403 }
      );
    }

    await connectDB();
    const { searchParams } = new URL(request.url);

    // Sayfalama
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    // Filtreler — SYSTEM_ADMIN tüm tenant'ları görebilir, diğerleri sadece kendi tenant'ını
    const filter = role === "SYSTEM_ADMIN" ? {} : { tenantId };

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

    // Kaynak ID filtresi (belirli bir cihaz/profil/dashboard için)
    const entityId = searchParams.get("entityId");
    if (entityId) {
      filter.entityId = entityId;
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

    // Arama
    const search = searchParams.get("search");
    if (search) {
      filter.$or = [
        { entityName: { $regex: escapeRegex(search), $options: "i" } },
        { action: { $regex: escapeRegex(search), $options: "i" } },
        { status: { $regex: escapeRegex(search), $options: "i" } },
        { "details.ip": { $regex: escapeRegex(search), $options: "i" } },
        { "details.reason": { $regex: escapeRegex(search), $options: "i" } }
      ];
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
      { status: error.statusCode || 500 }
    );
  }
}
