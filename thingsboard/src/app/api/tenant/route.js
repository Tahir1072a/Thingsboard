/**
 * /api/tenant — Tenant (Kiracı) Yönetimi API
 *
 * GET  — Tenant listesi (sadece SYSTEM_ADMIN)
 * POST — Yeni tenant oluştur (sadece SYSTEM_ADMIN)
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Tenant from "@/models/Tenant";
import User from "@/models/User";
import Device from "@/models/Device";
import { requireSystemAdmin, isAuthError } from "@/lib/rbac";

/**
 * organizationName'den URL-safe slug oluştur (Türkçe karakter desteği)
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

export async function GET(request) {
  try {
    const auth = await requireSystemAdmin();
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";
    const active = searchParams.get("active");

    await connectDB();

    const filter = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
      ];
    }

    if (plan && ["FREE", "PRO", "ENTERPRISE"].includes(plan)) {
      filter.plan = plan;
    }

    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;

    const total = await Tenant.countDocuments(filter);
    const tenants = await Tenant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Her tenant için kullanıcı ve cihaz sayısını hesapla
    const data = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCount, deviceCount] = await Promise.all([
          User.countDocuments({ tenantId: tenant._id }),
          Device.countDocuments({ tenantId: tenant._id }),
        ]);
        return {
          ...tenant,
          _stats: { userCount, deviceCount },
        };
      })
    );

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
    console.error("[GET /api/tenant]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await requireSystemAdmin();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    const body = await request.json();
    const { name, plan, settings } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Organizasyon adı zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    // Slug oluştur
    let slug = createSlug(name);
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const tenantData = {
      name: name.trim(),
      slug,
      createdBy: userId,
    };

    if (plan && ["FREE", "PRO", "ENTERPRISE"].includes(plan)) {
      tenantData.plan = plan;
    }

    if (settings) {
      tenantData.settings = {};
      if (typeof settings.maxDevices === "number") {
        tenantData.settings.maxDevices = settings.maxDevices;
      }
      if (typeof settings.maxUsers === "number") {
        tenantData.settings.maxUsers = settings.maxUsers;
      }
    }

    const tenant = await Tenant.create(tenantData);

    return NextResponse.json(
      {
        ok: true,
        message: "Organizasyon oluşturuldu.",
        data: tenant,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/tenant]", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { ok: false, error: "Bu organizasyon adı zaten mevcut." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message || "Sunucu hatası." },
      { status: 500 }
    );
  }
}
