/**
 * /api/tenant/[id] — Tekil Tenant Yönetimi
 *
 * GET    — Tenant detayı + istatistikler (SYSTEM_ADMIN)
 * PUT    — Tenant güncelle (SYSTEM_ADMIN)
 * DELETE — Tenant soft delete / deaktif et (SYSTEM_ADMIN)
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Tenant from "@/models/Tenant";
import User from "@/models/User";
import Device from "@/models/Device";
import { requireSystemAdmin, isAuthError } from "@/lib/rbac";

export async function GET(request, { params }) {
  try {
    const auth = await requireSystemAdmin();
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz tenant ID." },
        { status: 400 }
      );
    }

    await connectDB();
    const tenant = await Tenant.findById(id).lean();

    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "Tenant bulunamadı." },
        { status: 404 }
      );
    }

    // İstatistikleri hesapla
    const [userCount, deviceCount] = await Promise.all([
      User.countDocuments({ tenantId: tenant._id }),
      Device.countDocuments({ tenantId: tenant._id }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        ...tenant,
        _stats: { userCount, deviceCount },
      },
    });
  } catch (error) {
    console.error("[GET /api/tenant/:id]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireSystemAdmin();
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz tenant ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, plan, isActive, settings } = body;

    await connectDB();

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "Tenant bulunamadı." },
        { status: 404 }
      );
    }

    // Güncellenebilir alanlar
    if (name !== undefined && name.trim()) {
      tenant.name = name.trim();
    }
    if (plan && ["FREE", "PRO", "ENTERPRISE"].includes(plan)) {
      tenant.plan = plan;
    }
    if (typeof isActive === "boolean") {
      tenant.isActive = isActive;
    }
    if (settings) {
      if (typeof settings.maxDevices === "number") {
        tenant.settings.maxDevices = settings.maxDevices;
      }
      if (typeof settings.maxUsers === "number") {
        tenant.settings.maxUsers = settings.maxUsers;
      }
    }

    await tenant.save();

    return NextResponse.json({
      ok: true,
      message: "Tenant güncellendi.",
      data: tenant,
    });
  } catch (error) {
    console.error("[PUT /api/tenant/:id]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireSystemAdmin();
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz tenant ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return NextResponse.json(
        { ok: false, error: "Tenant bulunamadı." },
        { status: 404 }
      );
    }

    // Soft delete: isActive = false
    tenant.isActive = false;
    await tenant.save();

    return NextResponse.json({
      ok: true,
      message: "Tenant deaktif edildi.",
    });
  } catch (error) {
    console.error("[DELETE /api/tenant/:id]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}
