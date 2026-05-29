/**
 * /api/device/[id] — Tekil cihaz işlemleri
 *
 * GET    → Cihaz detayı
 * PUT    → Güncelle
 * DELETE → Sil
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Device from "@/models/Device";
import DeviceProfile from "@/models/DeviceProfile";
import mongoose from "mongoose";
import { getSessionUser } from "@/lib/getSessionUser";
import { invalidateDevice } from "@/lib/cache";

// ------------------------------------------------------------------ //
// GET — Tekil cihaz
// ------------------------------------------------------------------ //
export async function GET(request, { params }) {
  try {
    const userId = await getSessionUser();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();
    const device = await Device.findOne({ _id: id, userId }).populate("profile").lean();

    if (!device) {
      return NextResponse.json({ ok: false, message: "Cihaz bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: device });
  } catch (error) {
    console.error("[GET /api/device/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

// ------------------------------------------------------------------ //
// PUT — Güncelle
// ------------------------------------------------------------------ //
export async function PUT(request, { params }) {
  try {
    const userId = await getSessionUser();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();

    // accessToken ve userId değiştirilemez (güvenlik)
    const { accessToken: _discard, userId: _discardUser, ...updateData } = body;

    const device = await Device.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    ).populate("profile").lean();

    if (!device) {
      return NextResponse.json({ ok: false, message: "Cihaz bulunamadı." }, { status: 404 });
    }

    // Redis cache'ini temizle
    await invalidateDevice(id);

    return NextResponse.json({ ok: true, data: device, message: "Cihaz güncellendi." });
  } catch (error) {
    console.error("[PUT /api/device/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}

// ------------------------------------------------------------------ //
// DELETE — Sil
// ------------------------------------------------------------------ //
export async function DELETE(request, { params }) {
  try {
    const userId = await getSessionUser();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();
    const device = await Device.findOneAndDelete({ _id: id, userId });

    if (!device) {
      return NextResponse.json({ ok: false, message: "Cihaz bulunamadı." }, { status: 404 });
    }

    // Redis cache'ini temizle
    await invalidateDevice(id);

    return NextResponse.json({ ok: true, message: "Cihaz silindi." });
  } catch (error) {
    console.error("[DELETE /api/device/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}
