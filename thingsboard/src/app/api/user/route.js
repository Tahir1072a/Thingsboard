/**
 * /api/user — Kullanıcı Yönetimi API
 *
 * GET  — Kullanıcı listesi (sadece ADMIN)
 * POST — Kullanıcı davet et (sadece ADMIN)
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAdmin, isAuthError } from "@/lib/rbac";
import { genToken, hashPassword } from "@/lib/security";
import { createAuditLog } from "@/lib/audit-service";
import { sendMail } from "@/lib/email";

export async function GET(request) {
  try {
    const auth = await requireAdmin();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const active = searchParams.get("active");

    await connectDB();

    const filter = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { email: { $regex: escaped, $options: "i" } },
        { firstName: { $regex: escaped, $options: "i" } },
        { lastName: { $regex: escaped, $options: "i" } },
      ];
    }

    if (role && ["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
      filter.role = role;
    }

    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    const total = await User.countDocuments(filter);
    const data = await User.find(filter)
      .select("-password -resetToken -resetTokenExpiry -inviteToken -inviteTokenExpiry")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      ok: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/user]", error);
    const status = error.statusCode || 500;
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    const body = await request.json();
    const { email, firstName, lastName, role } = body;

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "E-posta adresi zorunludur." },
        { status: 400 }
      );
    }

    if (!["ADMIN", "OPERATOR", "VIEWER"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz rol. ADMIN, OPERATOR veya VIEWER seçin." },
        { status: 400 }
      );
    }

    await connectDB();

    // E-posta benzersizlik kontrolü
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Bu e-posta adresi zaten kayıtlı." },
        { status: 409 }
      );
    }

    // Davet token'ı oluştur
    const inviteToken = genToken(32);
    const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 gün

    // Kullanıcı oluştur (şifresiz, aktif değil — aktivasyon bekliyor)
    const user = await User.create({
      email: email.toLowerCase(),
      firstName: firstName || "",
      lastName: lastName || "",
      role,
      provider: "invite",
      isActive: false,
      invitedBy: userId,
      inviteToken,
      inviteTokenExpiry,
    });

    // Davet e-postası gönder
    const activateUrl = `${process.env.NEXTAUTH_URL}/activate?uid=${user._id}&token=${inviteToken}`;
    try {
      await sendMail({
        to: email,
        subject: "Pengona Things — Hesap Daveti",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6d28d9;">Pengona Things Platformuna Davet Edildiniz</h2>
            <p>Merhaba ${firstName || ""},</p>
            <p>Pengona Things IoT platformunda <strong>${role === "ADMIN" ? "Yönetici" : role === "OPERATOR" ? "Operatör" : "İzleyici"}</strong> rolü ile bir hesap oluşturuldu.</p>
            <p>Hesabınızı aktifleştirmek ve şifrenizi belirlemek için aşağıdaki bağlantıya tıklayın:</p>
            <p style="margin: 24px 0;">
              <a href="${activateUrl}" style="background: linear-gradient(135deg, #6d28d9, #4f46e5); color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Hesabımı Aktifleştir
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Bu bağlantı 7 gün geçerlidir.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("[POST /api/user] Davet maili gönderilemedi:", mailErr);
      // E-posta gönderilmese bile kullanıcı oluşturuldu — dev URL logla
      if (process.env.NODE_ENV === "development") {
        console.log("[DEV] Aktivasyon URL:", activateUrl);
      }
    }

    // Denetim günlüğü
    await createAuditLog({
      userId,
      action: "USER_CREATE",
      entityType: "USER",
      entityId: user._id,
      entityName: user.fullName || user.email,
      status: "SUCCESS",
      details: { invitedRole: role, email },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Kullanıcı davet edildi.",
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/user]", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { ok: false, error: "Bu e-posta adresi zaten kayıtlı." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: 500 }
    );
  }
}
