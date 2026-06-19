/**
 * /api/user/[id] — Tekil Kullanıcı Yönetimi
 *
 * GET    — Kullanıcı detayı (ADMIN)
 * PUT    — Kullanıcı güncelle (ADMIN)
 * DELETE — Kullanıcı sil (ADMIN)
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAdmin, isAuthError } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit-service";

export async function GET(request, { params }) {
  try {
    const auth = await requireAdmin();
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz kullanıcı ID." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(id)
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
    const auth = await requireAdmin();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

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

    const user = await User.findById(id);
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

    // Son ADMIN'i deaktif edemez / rolünü düşüremez
    if (user.role === "ADMIN") {
      const adminCount = await User.countDocuments({ role: "ADMIN", isActive: true });
      if (adminCount <= 1) {
        if (isActive === false || (role && role !== "ADMIN")) {
          return NextResponse.json(
            { ok: false, error: "Son yönetici deaktif edilemez veya rolü düşürülemez." },
            { status: 400 }
          );
        }
      }
    }

    const changes = {};
    if (role && ["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
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
    const auth = await requireAdmin();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz kullanıcı ID." },
        { status: 400 }
      );
    }

    // Kendi kendini silemez
    if (id === userId) {
      return NextResponse.json(
        { ok: false, error: "Kendi hesabınızı silemezsiniz." },
        { status: 403 }
      );
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    // Son ADMIN silinemez
    if (user.role === "ADMIN") {
      const adminCount = await User.countDocuments({ role: "ADMIN", isActive: true });
      if (adminCount <= 1) {
        return NextResponse.json(
          { ok: false, error: "Son yönetici silinemez." },
          { status: 400 }
        );
      }
    }

    await User.findByIdAndDelete(id);

    await createAuditLog({
      userId,
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
