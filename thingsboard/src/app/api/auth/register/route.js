/**
 * /api/auth/register — Kullanıcı Kayıt Endpoint'i
 *
 * POST body:
 * {
 *   "email": "user@example.com",
 *   "password": "...",
 *   "firstName": "...",
 *   "lastName": "...",
 *   "phone": "...",          // opsiyonel
 *   "organizationName": "..." // opsiyonel
 * }
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/securty";

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

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Parola en az 6 karakter olmalıdır." },
        { status: 400 }
      );
    }

    await connectDB();

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

    // Kullanıcı oluştur
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      phone: phone ?? "",
      organizationName: organizationName ?? "",
      provider: "credentials",
      isActive: true,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Kayıt başarılı! Giriş yapabilirsiniz.",
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
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
