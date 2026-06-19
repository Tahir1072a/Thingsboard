/**
 * /api/auth/activate — Hesap Aktivasyonu
 *
 * Davet edilen kullanıcı e-postasındaki linke tıklayınca
 * bu endpoint'e şifresini gönderir.
 *
 * POST body:
 * {
 *   "userId": "...",
 *   "token": "...",
 *   "password": "..."
 * }
 *
 * Başarılı → isActive: true, şifre hash'lenir, inviteToken temizlenir
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/security";
import { createAuditLog } from "@/lib/audit-service";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, token, password } = body;

    // Temel doğrulama
    if (!userId || !token || !password) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı ID, token ve parola zorunludur." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Parola en az 8 karakter olmalıdır." },
        { status: 400 }
      );
    }

    await connectDB();

    // Token dahil kullanıcıyı bul (select: false alanları açıkça iste)
    const user = await User.findById(userId).select(
      "+inviteToken +inviteTokenExpiry +password"
    );

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    // Zaten aktif mi?
    if (user.isActive && user.password) {
      return NextResponse.json(
        { ok: false, error: "Bu hesap zaten aktif." },
        { status: 400 }
      );
    }

    // Token doğrulama
    if (!user.inviteToken || user.inviteToken !== token) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz aktivasyon bağlantısı." },
        { status: 400 }
      );
    }

    // Token süresi dolmuş mu?
    if (user.inviteTokenExpiry && new Date() > user.inviteTokenExpiry) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Aktivasyon bağlantısının süresi dolmuş. Lütfen yöneticinizden yeni bir davet isteyin.",
        },
        { status: 400 }
      );
    }

    // Şifreyi hash'le ve kullanıcıyı aktifleştir
    const hashedPassword = await hashPassword(password);

    user.password = hashedPassword;
    user.isActive = true;
    user.inviteToken = null;
    user.inviteTokenExpiry = null;
    await user.save();

    // Audit log
    await createAuditLog({
      userId: user._id,
      tenantId: user.tenantId || null,
      action: "USER_ACTIVATE",
      entityType: "USER",
      entityId: user._id,
      entityName:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
      status: "SUCCESS",
      details: { method: "invite_token" },
    });

    return NextResponse.json({
      ok: true,
      message: "Hesabınız başarıyla aktive edildi. Giriş yapabilirsiniz.",
    });
  } catch (error) {
    console.error("[POST /api/auth/activate]", error);
    return NextResponse.json(
      { ok: false, error: "Aktivasyon sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
