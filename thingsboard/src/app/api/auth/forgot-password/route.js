/**
 * /api/auth/forgot-password — Parola Sıfırlama Talebi
 *
 * POST body: { "email": "user@example.com" }
 *
 * Kullanıcının e-posta adresine parola sıfırlama bağlantısı gönderir.
 * Güvenlik: Kullanıcı bulunamasa bile aynı başarılı yanıtı döner
 * (user enumeration saldırılarını engeller).
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { genToken } from "@/lib/security";
import { sendEmail } from "@/lib/email";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// Sıfırlama token'ı geçerlilik süresi: 1 saat (ms)
const RESET_TOKEN_TTL = 60 * 60 * 1000;

export async function POST(request) {
  try {
    const rateLimitResponse = await rateLimit(request, RATE_LIMITS.auth);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "E-posta adresi zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    // Kullanıcıyı bul (password alanını dahil etmiyoruz)
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // ── Güvenlik: Kullanıcı bulunamasa bile aynı mesajı dön ──
    const successMessage =
      "E-posta adresiniz sistemimizde kayıtlıysa, bir parola sıfırlama bağlantısı gönderilmiştir.";

    if (!user) {
      return NextResponse.json({ ok: true, message: successMessage });
    }

    // Devre dışı hesaplar için sıfırlama engelle
    if (!user.isActive) {
      return NextResponse.json({ ok: true, message: successMessage });
    }

    // ── Reset token üret ve kaydet ──
    const resetToken = genToken(32);
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL);
    await user.save();

    // ── Reset URL oluştur ──
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?uid=${user._id}&token=${resetToken}`;

    // ── E-posta gönder ──
    try {
      await sendEmail({
        to: user.email,
        subject: "Parola Sıfırlama Talebi",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0a0a0a; border-radius: 12px; border: 1px solid #222;">
            <h2 style="color: #ffffff; margin-top: 0; font-size: 22px;">Parola Sıfırlama</h2>
            <p style="color: #a0a0a0; font-size: 14px; line-height: 1.7;">
              Hesabınız için parola sıfırlama talebinde bulunuldu. Aşağıdaki butona tıklayarak yeni bir parola belirleyebilirsiniz:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; padding: 12px 32px; background: linear-gradient(to right, #4c1d1d, #dc2626, #4c1d1d); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
                Parolayı Sıfırla
              </a>
            </div>
            <p style="color: #666; font-size: 13px; line-height: 1.6;">
              Bu bağlantı <strong>1 saat</strong> süreyle geçerlidir.<br/>
              Eğer bu talebi siz yapmadıysanız, bu e-postayı güvenle görmezden gelebilirsiniz.
            </p>
            <hr style="border: none; border-top: 1px solid #222; margin: 24px 0;" />
            <p style="color: #444; font-size: 11px;">Thingsboard IoT Platform</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[forgot-password] E-posta gönderilemedi:", emailErr.message);

      // Development ortamında kolaylık: reset URL'yi konsola yaz
      if (process.env.NODE_ENV === "development") {
        console.log("\n──────────────────────────────────────────");
        console.log("🔑 [DEV] Parola sıfırlama bağlantısı:");
        console.log(`   ${resetUrl}`);
        console.log("──────────────────────────────────────────\n");
      }
    }

    return NextResponse.json({ ok: true, message: successMessage });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return NextResponse.json(
      { ok: false, message: "İşlem sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
