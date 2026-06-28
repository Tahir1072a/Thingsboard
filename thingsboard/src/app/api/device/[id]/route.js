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
import { auditDeviceAction } from "@/lib/audit-service";

// ------------------------------------------------------------------ //
// GET — Tekil cihaz
// ------------------------------------------------------------------ //
export async function GET(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();
    const device = await Device.findOne({ _id: id, tenantId }).populate("profile").lean();

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
    const { userId, tenantId, canWrite } = await getSessionUser();
    if (!canWrite) {
      return NextResponse.json({ ok: false, message: "Bu işlem için yetkiniz yok." }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();

    // accessToken ve userId değiştirilemez (güvenlik)
    const { accessToken: _discard, userId: _discardUser, tenantId: _discardTenant, ...updateData } = body;

    const device = await Device.findOneAndUpdate(
      { _id: id, tenantId },
      updateData,
      { new: true, runValidators: true }
    ).populate("profile").lean();

    if (!device) {
      return NextResponse.json({ ok: false, message: "Cihaz bulunamadı." }, { status: 404 });
    }

    // Redis cache'ini temizle
    await invalidateDevice(id);

    // Audit log
    auditDeviceAction(userId, "DEVICE_UPDATE", device, { changes: updateData }, tenantId);

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
    const { userId, tenantId, canWrite } = await getSessionUser();
    if (!canWrite) {
      return NextResponse.json({ ok: false, message: "Bu işlem için yetkiniz yok." }, { status: 403 });
    }
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Geçersiz ID." }, { status: 400 });
    }

    await connectDB();
    const device = await Device.findOneAndDelete({ _id: id, tenantId });

    if (!device) {
      return NextResponse.json({ ok: false, message: "Cihaz bulunamadı." }, { status: 404 });
    }

    // Redis cache'ini temizle
    await invalidateDevice(id);

    // Audit log
    auditDeviceAction(userId, "DEVICE_DELETE", device, {}, tenantId);

    return NextResponse.json({ ok: true, message: "Cihaz silindi." });
  } catch (error) {
    console.error("[DELETE /api/device/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: error.statusCode || 500 });
  }
}
