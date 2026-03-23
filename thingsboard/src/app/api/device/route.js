/**
 * /api/device — Cihaz listeleme ve oluşturma
 *
 * GET  → Listeleme + sayfalama + arama
 * POST → Yeni cihaz oluştur (accessToken otomatik üretilir)
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Device from "@/models/Device";
import DeviceProfile from "@/models/DeviceProfile";
import { getSessionUser } from "@/lib/getSessionUser";

// ------------------------------------------------------------------ //
// GET — Listeleme
// ------------------------------------------------------------------ //
export async function GET(request) {
  try {
    const userId = await getSessionUser();

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10")));
    const search = searchParams.get("search") ?? "";
    const active = searchParams.get("active"); // "true" | "false" | null

    await connectDB();

    const filter = { userId };

    // Metin araması
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { tag: { $regex: search, $options: "i" } },
        { accessToken: search }, // tam eşleşme
      ];
    }

    // Durum filtresi
    if (active === "true") filter.status = "active";
    else if (active === "false") filter.status = "inactive";

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Device.find(filter).populate("profile").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Device.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/device]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

// ------------------------------------------------------------------ //
// POST — Yeni cihaz oluştur
// ------------------------------------------------------------------ //
export async function POST(request) {
  try {
    const userId = await getSessionUser();
    const body = await request.json();

    const { name, profile, tag, description, isGateway, isPublic, accessToken } = body;

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "Cihaz adı zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    const device = await Device.create({
      userId,
      name,
      profile: profile || null,
      tag: tag || "",
      description: description || "",
      isGateway: isGateway ?? false,
      isPublic: isPublic ?? false,
      accessToken: accessToken || undefined, // undefined → pre-validate hook üretir
      status: "active",
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Cihaz başarıyla oluşturuldu.",
        data: device.toObject(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/device]", error);

    // Unique constraint hatası (accessToken çakışması)
    if (error.code === 11000) {
      return NextResponse.json(
        { ok: false, message: "Bu access token zaten kullanımda." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
