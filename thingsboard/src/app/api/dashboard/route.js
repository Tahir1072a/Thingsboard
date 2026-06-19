/**
 * /api/dashboard — Pano listeleme ve oluşturma
 *
 * GET  → Kullanıcının panolarını listele
 * POST → Yeni pano oluştur
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Dashboard from "@/models/Dashboard";
import { getSessionUser } from "@/lib/getSessionUser";
import { auditDashboardAction } from "@/lib/audit-service";

// ------------------------------------------------------------------ //
// GET — Kullanıcının panolarını listele
// ------------------------------------------------------------------ //
export async function GET() {
  try {
    const { userId, tenantId } = await getSessionUser();

    await connectDB();

    const dashboards = await Dashboard.find({ tenantId })
      .sort({ updatedAt: -1 })
      .select("name description widgets createdAt updatedAt")
      .lean();

    return NextResponse.json({
      ok: true,
      data: dashboards.map((d) => ({
        ...d,
        widgetCount: d.widgets?.length || 0,
      })),
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

// ------------------------------------------------------------------ //
// POST — Yeni pano oluştur
// ------------------------------------------------------------------ //
export async function POST(request) {
  try {
    const { userId, tenantId } = await getSessionUser();

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "Pano adı zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    const dashboard = await Dashboard.create({
      name,
      description: description || "",
      ownerId: userId,
      tenantId,
      widgets: [],
    });

    // Audit log
    auditDashboardAction(userId, "DASHBOARD_CREATE", dashboard, {}, tenantId);

    return NextResponse.json(
      { ok: true, message: "Pano oluşturuldu.", data: dashboard.toObject() },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/dashboard]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
