/**
 * /api/device-profile/[id] — Tekil profil işlemleri
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import DeviceProfile from "@/models/DeviceProfile";
import mongoose from "mongoose";
import { getSessionUser } from "@/lib/getSessionUser";

// GET — Detay
export async function GET(request, { params }) {
  try {
    const userId = await getSessionUser();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();
    const profile = await DeviceProfile.findOne({ _id: id, userId }).lean();

    if (!profile) {
      return NextResponse.json({ ok: false, message: "Profil bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: profile });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

// PUT — Güncelle
export async function PUT(request, { params }) {
  try {
    const userId = await getSessionUser();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();
    const body = await request.json();
    const { name, description, transportType, isDefault, alarms } = body;

    const profile = await DeviceProfile.findOne({ _id: id, userId });
    if (!profile) {
      return NextResponse.json({ ok: false, message: "Profil bulunamadı." }, { status: 404 });
    }

    // Varsayılan değişikliği (user scope)
    if (isDefault && !profile.isDefault) {
      await DeviceProfile.updateMany(
        { userId, isDefault: true, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    if (name !== undefined) profile.name = name;
    if (description !== undefined) profile.description = description;
    if (transportType !== undefined) profile.transportType = transportType;
    if (isDefault !== undefined) profile.isDefault = isDefault;
    if (alarms !== undefined) profile.alarms = alarms;

    await profile.save();

    return NextResponse.json({
      ok: true,
      message: "Profil güncellendi.",
      data: profile.toObject(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

// DELETE — Sil
export async function DELETE(request, { params }) {
  try {
    const userId = await getSessionUser();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();
    const profile = await DeviceProfile.findOne({ _id: id, userId });

    if (!profile) {
      return NextResponse.json({ ok: false, message: "Profil bulunamadı." }, { status: 404 });
    }

    if (profile.isDefault) {
      return NextResponse.json(
        { ok: false, message: "Varsayılan profil silinemez." },
        { status: 400 }
      );
    }

    await DeviceProfile.findOneAndDelete({ _id: id, userId });

    return NextResponse.json({ ok: true, message: "Profil silindi." });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}
