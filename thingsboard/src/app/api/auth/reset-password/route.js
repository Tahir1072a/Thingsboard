/**
 * /api/auth/reset-password — Parola Sıfırlama İşlemi
 *
 * POST body:
 * {
 *   "userId":   "MongoDB ObjectId",
 *   "token":    "sıfırlama token'ı (e-posta ile gönderilen)",
 *   "password": "yeni parola"
 * }
 *
 * Token doğrulanır, süre kontrolü yapılır, yeni parola hash'lenip kaydedilir.
 * Token tek kullanımlıktır — işlem sonrası temizlenir.
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/securty";
import mongoose from "mongoose";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, token, password } = body;

    // ── Temel doğrulama ──
    if (!userId || !token || !password) {
      return NextResponse.json(
        { ok: false, message: "Tüm alanlar zorunludur (userId, token, password)." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { ok: false, message: "Geçersiz veya süresi dolmuş bağlantı." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, message: "Parola en az 8 karakter olmalıdır." },
        { status: 400 }
      );
    }

    await connectDB();

    // ── Kullanıcıyı bul (resetToken alanlarını dahil et) ──
    const user = await User.findById(userId).select(
      "+resetToken +resetTokenExpiry +password"
    );

    // Geçersiz kullanıcı veya token yoksa
    if (!user || !user.resetToken) {
      return NextResponse.json(
        { ok: false, message: "Geçersiz veya süresi dolmuş bağlantı." },
        { status: 400 }
      );
    }

    // ── Token eşleşme kontrolü ──
    if (user.resetToken !== token) {
      return NextResponse.json(
        { ok: false, message: "Geçersiz veya süresi dolmuş bağlantı." },
        { status: 400 }
      );
    }

    // ── Süre kontrolü ──
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      // Token süresi dolmuş — temizle
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();

      return NextResponse.json(
        {
          ok: false,
          message:
            "Sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir sıfırlama talebi oluşturun.",
        },
        { status: 400 }
      );
    }

    // ── Yeni parolayı hash'le ve kaydet ──
    user.password = await hashPassword(password);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    console.log(`[reset-password] Parola güncellendi: ${user.email}`);

    return NextResponse.json({
      ok: true,
      message: "Parolanız başarıyla güncellendi. Şimdi giriş yapabilirsiniz.",
    });
  } catch (error) {
    console.error("[POST /api/auth/reset-password]", error);
    return NextResponse.json(
      { ok: false, message: "İşlem sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
