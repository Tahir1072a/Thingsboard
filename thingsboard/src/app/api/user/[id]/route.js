/**
 * /api/user/[id] — Tekil Kullanıcı Yönetimi (Multi-Tenant)
 *
 * GET    — Kullanıcı detayı (TENANT_ADMIN / SYSTEM_ADMIN)
 * PUT    — Kullanıcı güncelle (TENANT_ADMIN / SYSTEM_ADMIN)
 * DELETE — Kullanıcı sil (TENANT_ADMIN / SYSTEM_ADMIN)
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireTenantAdmin, isAuthError } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit-service";

export async function GET(request, { params }) {
  try {
    const auth = await requireTenantAdmin();
    if (isAuthError(auth)) return auth;
    const { role, tenantId } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz kullanıcı ID." },
        { status: 400 }
      );
    }

    await connectDB();

    // TENANT_ADMIN sadece kendi tenant'ındaki kullanıcıları görebilir
    const filter = { _id: id };
    if (role !== "SYSTEM_ADMIN") filter.tenantId = tenantId;

    const user = await User.findOne(filter)
      .select("-password -resetToken -resetTokenExpiry -inviteToken -inviteTokenExpiry")
      .lean();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: user });
  } catch (error) {
    console.error("[GET /api/user/:id]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireTenantAdmin();
    if (isAuthError(auth)) return auth;
    const { userId, role: authRole, tenantId } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz kullanıcı ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { role, isActive, firstName, lastName } = body;

    await connectDB();

    // TENANT_ADMIN sadece kendi tenant'ındaki kullanıcıları düzenleyebilir
    const findFilter = { _id: id };
    if (authRole !== "SYSTEM_ADMIN") findFilter.tenantId = tenantId;

    const user = await User.findOne(findFilter);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    // Kendi rolünü düşüremez
    if (id === userId && role && role !== user.role) {
      return NextResponse.json(
        { ok: false, error: "Kendi rolünüzü değiştiremezsiniz." },
        { status: 403 }
      );
    }

    // Son TENANT_ADMIN'i koruması
    if (user.role === "TENANT_ADMIN" && user.tenantId) {
      const adminCount = await User.countDocuments({
        tenantId: user.tenantId,
        role: "TENANT_ADMIN",
        isActive: true,
      });
      if (adminCount <= 1) {
        if (isActive === false || (role && role !== "TENANT_ADMIN")) {
          return NextResponse.json(
            { ok: false, error: "Son yönetici deaktif edilemez veya rolü düşürülemez." },
            { status: 400 }
          );
        }
      }
    }

    // TENANT_ADMIN sadece OPERATOR/VIEWER atayabilir, SYSTEM_ADMIN her şeyi
    const allowedRoles =
      authRole === "SYSTEM_ADMIN"
        ? ["SYSTEM_ADMIN", "TENANT_ADMIN", "OPERATOR", "VIEWER"]
        : ["TENANT_ADMIN", "OPERATOR", "VIEWER"];

    const changes = {};
    if (role && allowedRoles.includes(role)) {
      changes.role = role;
      user.role = role;
    }
    if (typeof isActive === "boolean") {
      changes.isActive = isActive;
      user.isActive = isActive;
    }
    if (firstName !== undefined) {
      changes.firstName = firstName;
      user.firstName = firstName;
    }
    if (lastName !== undefined) {
      changes.lastName = lastName;
      user.lastName = lastName;
    }

    await user.save();

    await createAuditLog({
      userId,
      tenantId,
      action: "USER_UPDATE",
      entityType: "USER",
      entityId: user._id,
      entityName: user.fullName || user.email,
      status: "SUCCESS",
      details: { changes },
    });

    return NextResponse.json({
      ok: true,
      message: "Kullanıcı güncellendi.",
      data: {
        _id: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error("[PUT /api/user/:id]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireTenantAdmin();
    if (isAuthError(auth)) return auth;
    const { userId, role: authRole, tenantId } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz kullanıcı ID." },
        { status: 400 }
      );
    }

    if (id === userId) {
      return NextResponse.json(
        { ok: false, error: "Kendi hesabınızı silemezsiniz." },
        { status: 403 }
      );
    }

    await connectDB();

    // TENANT_ADMIN sadece kendi tenant'ındaki kullanıcıları silebilir
    const findFilter = { _id: id };
    if (authRole !== "SYSTEM_ADMIN") findFilter.tenantId = tenantId;

    const user = await User.findOne(findFilter);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    // Son TENANT_ADMIN silinemez
    if (user.role === "TENANT_ADMIN" && user.tenantId) {
      const adminCount = await User.countDocuments({
        tenantId: user.tenantId,
        role: "TENANT_ADMIN",
        isActive: true,
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { ok: false, error: "Son yönetici silinemez." },
          { status: 400 }
        );
      }
    }

    // SYSTEM_ADMIN silinemez (TENANT_ADMIN tarafından)
    if (user.role === "SYSTEM_ADMIN" && authRole !== "SYSTEM_ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Sistem yöneticisini silme yetkiniz yok." },
        { status: 403 }
      );
    }

    await User.findByIdAndDelete(id);

    await createAuditLog({
      userId,
      tenantId,
      action: "USER_DELETE",
      entityType: "USER",
      entityId: user._id,
      entityName: user.fullName || user.email,
      status: "SUCCESS",
      details: { deletedRole: user.role, email: user.email },
    });

    return NextResponse.json({ ok: true, message: "Kullanıcı silindi." });
  } catch (error) {
    console.error("[DELETE /api/user/:id]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}
