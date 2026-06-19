/**
 * /api/user/profile — Kendi Profil Yönetimi
 *
 * GET — Kendi profil bilgileri (herkes)
 * PUT — Kendi profilini güncelle (herkes)
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAnyAuth, isAuthError } from "@/lib/rbac";

export async function GET() {
  try {
    const auth = await requireAnyAuth();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    await connectDB();
    const user = await User.findById(userId)
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
    console.error("[GET /api/user/profile]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAnyAuth();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    const body = await request.json();
    const { firstName, lastName, phone, organizationName, image } = body;

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    // Sadece izin verilen alanları güncelle (rol, email, isActive YASAK)
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (organizationName !== undefined) user.organizationName = organizationName;
    if (image !== undefined) user.image = image;

    await user.save();

    return NextResponse.json({
      ok: true,
      message: "Profil güncellendi.",
      data: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        organizationName: user.organizationName,
        image: user.image,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[PUT /api/user/profile]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}
