/**
 * /api/device-profile — Cihaz profili listeleme ve oluşturma
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DeviceProfile from "@/models/DeviceProfile";
import { getSessionUser } from "@/lib/getSessionUser";

// GET — Listele (search + pagination)
export async function GET(request) {
  try {
    const userId = await getSessionUser();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const transportType = searchParams.get("transportType") || "";

    const filter = { userId };
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    if (transportType) {
      filter.transportType = transportType;
    }

    const [data, total] = await Promise.all([
      DeviceProfile.find(filter)
        .sort({ isDefault: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DeviceProfile.countDocuments(filter),
    ]);

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
    console.error("[GET /api/device-profile]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

// POST — Oluştur
export async function POST(request) {
  try {
    const userId = await getSessionUser();
    await connectDB();
    const body = await request.json();

    const { name, description, transportType, isDefault, alarms } = body;

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "Profil adı zorunludur." },
        { status: 400 }
      );
    }

    // Eğer yeni profil "varsayılan" olacaksa diğerlerinin default'unu kaldır (user scope)
    if (isDefault) {
      await DeviceProfile.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const profile = await DeviceProfile.create({
      userId,
      name,
      description: description || "",
      transportType: transportType || "MQTT",
      isDefault: isDefault || false,
      alarms: alarms || [],
    });

    return NextResponse.json(
      { ok: true, message: "Profil oluşturuldu.", data: profile.toObject() },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/device-profile]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}
