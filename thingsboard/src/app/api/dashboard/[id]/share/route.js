/**
 * /api/dashboard/[id]/share — Pano paylaşım yönetimi
 *
 * POST   → Paylaşımı aç (publicToken oluştur)
 * DELETE → Paylaşımı kapat
 * PUT    → Paylaşım ayarlarını güncelle (expiresAt, embedEnabled)
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import Dashboard from "@/models/Dashboard";
import { getSessionUser } from "@/lib/getSessionUser";
import { auditDashboardAction } from "@/lib/audit-service";

// ------------------------------------------------------------------ //
// POST — Paylaşımı aç
// ------------------------------------------------------------------ //
export async function POST(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;

    await connectDB();
    const dashboard = await Dashboard.findOne({ _id: id, tenantId });

    if (!dashboard) {
      return NextResponse.json(
        { ok: false, message: "Pano bulunamadı." },
        { status: 404 }
      );
    }

    // Token oluştur
    const publicToken = crypto.randomUUID();
    dashboard.isPublic = true;
    dashboard.publicToken = publicToken;

    // Opsiyonel body: { expiresAt, embedEnabled }
    try {
      const body = await request.json();
      if (body.expiresAt) {
        dashboard.shareSettings.expiresAt = new Date(body.expiresAt);
      }
      if (body.embedEnabled !== undefined) {
        dashboard.shareSettings.embedEnabled = Boolean(body.embedEnabled);
      }
    } catch {
      // Body boş olabilir — sorun değil
    }

    await dashboard.save();

    const publicUrl = `${process.env.NEXTAUTH_URL}/d/${publicToken}`;

    // Audit log
    auditDashboardAction(userId, "DASHBOARD_UPDATE", dashboard, {
      action: "SHARE_ENABLE",
    }, tenantId);

    return NextResponse.json({
      ok: true,
      publicToken,
      publicUrl,
      message: "Paylaşım açıldı.",
    });
  } catch (error) {
    console.error("[POST /api/dashboard/:id/share]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}

// ------------------------------------------------------------------ //
// DELETE — Paylaşımı kapat
// ------------------------------------------------------------------ //
export async function DELETE(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;

    await connectDB();
    const dashboard = await Dashboard.findOne({ _id: id, tenantId });

    if (!dashboard) {
      return NextResponse.json(
        { ok: false, message: "Pano bulunamadı." },
        { status: 404 }
      );
    }

    dashboard.isPublic = false;
    dashboard.publicToken = null;
    dashboard.shareSettings = { expiresAt: null, embedEnabled: false };

    await dashboard.save();

    // Audit log
    auditDashboardAction(userId, "DASHBOARD_UPDATE", dashboard, {
      action: "SHARE_DISABLE",
    }, tenantId);

    return NextResponse.json({
      ok: true,
      message: "Paylaşım kapatıldı.",
    });
  } catch (error) {
    console.error("[DELETE /api/dashboard/:id/share]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}

// ------------------------------------------------------------------ //
// PUT — Paylaşım ayarlarını güncelle
// ------------------------------------------------------------------ //
export async function PUT(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;

    await connectDB();
    const dashboard = await Dashboard.findOne({ _id: id, tenantId });

    if (!dashboard) {
      return NextResponse.json(
        { ok: false, message: "Pano bulunamadı." },
        { status: 404 }
      );
    }

    if (!dashboard.isPublic) {
      return NextResponse.json(
        { ok: false, message: "Paylaşım açık değil." },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (body.expiresAt !== undefined) {
      dashboard.shareSettings.expiresAt = body.expiresAt
        ? new Date(body.expiresAt)
        : null;
    }
    if (body.embedEnabled !== undefined) {
      dashboard.shareSettings.embedEnabled = Boolean(body.embedEnabled);
    }

    await dashboard.save();

    // Audit log
    auditDashboardAction(userId, "DASHBOARD_UPDATE", dashboard, {
      action: "SHARE_SETTINGS_UPDATE",
      changes: body,
    }, tenantId);

    return NextResponse.json({
      ok: true,
      message: "Paylaşım ayarları güncellendi.",
      data: dashboard.shareSettings,
    });
  } catch (error) {
    console.error("[PUT /api/dashboard/:id/share]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}
