/**
 * /api/dashboard/[id]/clone — Dashboard Klonlama
 *
 * POST — Dashboard'u tüm widget'ları ile birlikte kopyalar.
 * Yeni isim: "Kopya — {orijinal isim}"
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import Dashboard from "@/models/Dashboard";
import { getSessionUser } from "@/lib/getSessionUser";
import { createAuditLog } from "@/lib/audit-service";

export async function POST(request, { params }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Oturum açmanız gerekiyor." },
        { status: 401 }
      );
    }
    const { userId, tenantId } = session;

    const { id } = await params;

    await connectDB();

    const original = await Dashboard.findOne({ _id: id, tenantId }).lean();
    if (!original) {
      return NextResponse.json(
        { ok: false, error: "Dashboard bulunamadı." },
        { status: 404 }
      );
    }

    // Widget'ların ID'lerini yenile
    const clonedWidgets = (original.widgets || []).map((w) => ({
      ...w,
      i: crypto.randomUUID().slice(0, 8),
    }));

    const clone = await Dashboard.create({
      name: `Kopya — ${original.name}`,
      description: original.description || "",
      ownerId: userId,
      tenantId,
      widgets: clonedWidgets,
      // Paylaşım kopyalanmaz
      isPublic: false,
      publicToken: null,
    });

    await createAuditLog({
      userId,
      tenantId,
      action: "DASHBOARD_CREATE",
      entityType: "DASHBOARD",
      entityId: clone._id,
      entityName: clone.name,
      status: "SUCCESS",
      details: { clonedFrom: original._id, widgetCount: clonedWidgets.length },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Dashboard klonlandı.",
        data: {
          _id: clone._id,
          name: clone.name,
          widgetCount: clone.widgets.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/dashboard/:id/clone]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: 500 }
    );
  }
}
