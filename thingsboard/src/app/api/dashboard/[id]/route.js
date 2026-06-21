/**
 * /api/dashboard/[id] — Tekil pano işlemleri
 *
 * GET    → Pano detayı (widget'lar dahil)
 * PUT    → Güncelle (widget ekle/çıkar, layout değiştir)
 * DELETE → Sil
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Dashboard from "@/models/Dashboard";
import mongoose from "mongoose";
import { getSessionUser } from "@/lib/getSessionUser";
import { auditDashboardAction } from "@/lib/audit-service";

// Sahiplik kontrolü (tenant-scoped)
async function verifyOwnership(id, tenantId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Geçersiz ID.", status: 400 };
  }

  await connectDB();
  const dashboard = await Dashboard.findOne({ _id: id, tenantId });

  if (!dashboard) {
    return { error: "Pano bulunamadı.", status: 404 };
  }

  return { dashboard };
}

// ------------------------------------------------------------------ //
// GET — Pano detayı
// ------------------------------------------------------------------ //
export async function GET(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();

    const { id } = await params;
    const result = await verifyOwnership(id, tenantId);

    if (result.error) {
      return NextResponse.json(
        { ok: false, message: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true, data: result.dashboard.toObject() });
  } catch (error) {
    console.error("[GET /api/dashboard/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

// ------------------------------------------------------------------ //
// PUT — Güncelle (layout + widget'lar)
// ------------------------------------------------------------------ //
export async function PUT(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();

    const { id } = await params;
    const result = await verifyOwnership(id, tenantId);

    if (result.error) {
      return NextResponse.json(
        { ok: false, message: result.error },
        { status: result.status }
      );
    }

    const body = await request.json();
    const { name, description, widgets } = body;

    const dashboard = result.dashboard;
    if (name !== undefined) dashboard.name = name;
    if (description !== undefined) dashboard.description = description;
    if (widgets !== undefined) {
      // Widget'ları sadece bilinen alanlarla sınırla
      dashboard.widgets = widgets.map((w) => ({
        i: w.i,
        type: w.type,
        devices: (w.devices || []).map((d) => ({ id: String(d.id), name: d.name || "" })),
        keys: w.keys || [],
        title: w.title || "Widget",
        config: w.config || {},
        x: Number.isFinite(w.x) ? w.x : 0,
        y: Number.isFinite(w.y) ? w.y : 0,
        w: Number.isFinite(w.w) ? w.w : 4,
        h: Number.isFinite(w.h) ? w.h : 3,
      }));
    }

    await dashboard.save();

    // Audit log (fire-and-forget)
    auditDashboardAction(userId, "DASHBOARD_UPDATE", dashboard, { changes: Object.keys(body) }, tenantId);

    return NextResponse.json({
      ok: true,
      message: "Pano güncellendi.",
      data: dashboard.toObject(),
    });
  } catch (error) {
    console.error("[PUT /api/dashboard/:id]", error.message);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

// ------------------------------------------------------------------ //
// DELETE — Sil
// ------------------------------------------------------------------ //
export async function DELETE(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();

    const { id } = await params;
    const result = await verifyOwnership(id, tenantId);

    if (result.error) {
      return NextResponse.json(
        { ok: false, message: result.error },
        { status: result.status }
      );
    }

    await Dashboard.findByIdAndDelete(id);

    // Audit log
    auditDashboardAction(userId, "DASHBOARD_DELETE", result.dashboard, {}, tenantId);

    return NextResponse.json({ ok: true, message: "Pano silindi." });
  } catch (error) {
    console.error("[DELETE /api/dashboard/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
