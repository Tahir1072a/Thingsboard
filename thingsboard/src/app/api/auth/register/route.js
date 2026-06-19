/**
 * /api/auth/register — Kullanıcı Kayıt Endpoint'i
 *
 * İlk kullanıcı otomatik ADMIN (Tenant Admin) olarak oluşturulur.
 * Sonraki kullanıcılar sadece ADMIN tarafından davet edilebilir.
 *
 * POST body:
 * {
 *   "email": "user@example.com",
 *   "password": "...",
 *   "firstName": "...",
 *   "lastName": "...",
 *   "phone": "...",
 *   "organizationName": "..."
 * }
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/security";

export async function POST(request) {
  try {
    const body = await request.json();

    const { email, password, firstName, lastName, phone, organizationName } = body;

    // Temel doğrulama
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "E-posta ve parola zorunludur." },
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

    // İlk kullanıcı kontrolü — sistemde hiç kullanıcı yoksa ADMIN olarak kaydet
    const userCount = await User.countDocuments();

    if (userCount > 0) {
      // Sistem zaten kurulmuş — sadece davet ile kayıt
      return NextResponse.json(
        { ok: false, error: "Kayıt kapatılmıştır. Sisteme katılmak için bir yöneticiden davet alın." },
        { status: 403 }
      );
    }

    // E-posta benzersizlik kontrolü
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "Bu e-posta adresi zaten kayıtlı." },
        { status: 409 }
      );
    }

    // Şifreyi hash'le
    const hashedPassword = await hashPassword(password);

    // İlk kullanıcı — ADMIN (Tenant Admin) olarak oluştur
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      phone: phone ?? "",
      organizationName: organizationName ?? "",
      provider: "credentials",
      role: "ADMIN",
      isActive: true,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Kayıt başarılı! İlk yönetici olarak kaydedildiniz.",
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { ok: false, error: "Kayıt sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
