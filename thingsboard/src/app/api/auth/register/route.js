/**
 * /api/auth/register — Kullanıcı Kayıt Endpoint'i (Multi-Tenant)
 *
 * Her kayıt yeni bir Tenant + TENANT_ADMIN oluşturur.
 * Tenant içi kullanıcılar sadece TENANT_ADMIN tarafından davet edilir.
 *
 * POST body:
 * {
 *   "email": "user@example.com",
 *   "password": "...",
 *   "firstName": "...",
 *   "lastName": "...",
 *   "phone": "...",
 *   "organizationName": "..." ← Tenant adı olarak kullanılır
 * }
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import { hashPassword } from "@/lib/security";

/**
 * organizationName'den URL-safe slug oluştur
 */
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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

    if (!organizationName || organizationName.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Organizasyon adı zorunludur." },
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

    // Slug oluştur (benzersizlik kontrolü ile)
    let slug = createSlug(organizationName);
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      // Slug çakışması — sonuna random suffix ekle
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // 1. Tenant oluştur
    const tenant = await Tenant.create({
      name: organizationName.trim(),
      slug,
      plan: "FREE",
      isActive: true,
    });

    // 2. Şifreyi hash'le
    const hashedPassword = await hashPassword(password);

    // 3. TENANT_ADMIN kullanıcı oluştur
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      phone: phone ?? "",
      organizationName: organizationName.trim(),
      provider: "credentials",
      role: "TENANT_ADMIN",
      tenantId: tenant._id,
      isActive: true,
    });

    // Tenant'ın createdBy alanını güncelle
    tenant.createdBy = user._id;
    await tenant.save();

    return NextResponse.json(
      {
        ok: true,
        message: "Kayıt başarılı! Organizasyonunuz oluşturuldu.",
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tenant: {
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
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
