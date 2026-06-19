/**
 * /api/user/password — Şifre Değiştirme
 *
 * PUT — Kendi şifresini değiştir (herkes)
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAnyAuth, isAuthError } from "@/lib/rbac";
import { hashPassword, verifyPassword } from "@/lib/security";

export async function PUT(request) {
  try {
    const auth = await requireAnyAuth();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Mevcut şifre ve yeni şifre zorunludur." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Yeni şifre en az 8 karakter olmalıdır." },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { ok: false, error: "Google ile giriş yapan hesaplarda şifre değiştirilemez. Önce 'Parolamı Unuttum' ile şifre belirleyin." },
        { status: 400 }
      );
    }

    // Mevcut şifre doğrulama
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "Mevcut şifre hatalı." },
        { status: 401 }
      );
    }

    // Yeni şifre hash'le ve kaydet
    user.password = await hashPassword(newPassword);
    await user.save();

    return NextResponse.json({
      ok: true,
      message: "Şifre başarıyla değiştirildi.",
    });
  } catch (error) {
    console.error("[PUT /api/user/password]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}
