/**
 * /api/dashboard/[id] — Tekil pano işlemleri
 *
 * GET    → Pano detayı (widget'lar dahil)
 * PUT    → Güncelle (widget ekle/çıkar, layout değiştir)
 * DELETE → Sil
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Dashboard from "@/models/Dashboard";
import mongoose from "mongoose";

// Sahiplik kontrolü
async function verifyOwnership(id, session) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Geçersiz ID.", status: 400 };
  }

  await connectDB();
  const dashboard = await Dashboard.findById(id);

  if (!dashboard) {
    return { error: "Pano bulunamadı.", status: 404 };
  }

  if (dashboard.ownerId.toString() !== session.user.id) {
    return { error: "Bu panoya erişim yetkiniz yok.", status: 403 };
  }

  return { dashboard };
}

// ------------------------------------------------------------------ //
// GET — Pano detayı
// ------------------------------------------------------------------ //
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
    }

    const { id } = await params;
    const result = await verifyOwnership(id, session);

    if (result.error) {
      return NextResponse.json(
        { ok: false, message: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true, data: result.dashboard.toObject() });
  } catch (error) {
    console.error("[GET /api/dashboard/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

// ------------------------------------------------------------------ //
// PUT — Güncelle (layout + widget'lar)
// ------------------------------------------------------------------ //
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
    }

    const { id } = await params;
    const result = await verifyOwnership(id, session);

    if (result.error) {
      return NextResponse.json(
        { ok: false, message: result.error },
        { status: result.status }
      );
    }

    const body = await request.json();
    const { name, description, widgets } = body;

    const dashboard = result.dashboard;
    if (name !== undefined) dashboard.name = name;
    if (description !== undefined) dashboard.description = description;
    if (widgets !== undefined) dashboard.widgets = widgets;

    await dashboard.save();

    return NextResponse.json({
      ok: true,
      message: "Pano güncellendi.",
      data: dashboard.toObject(),
    });
  } catch (error) {
    console.error("[PUT /api/dashboard/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

// ------------------------------------------------------------------ //
// DELETE — Sil
// ------------------------------------------------------------------ //
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
    }

    const { id } = await params;
    const result = await verifyOwnership(id, session);

    if (result.error) {
      return NextResponse.json(
        { ok: false, message: result.error },
        { status: result.status }
      );
    }

    await Dashboard.findByIdAndDelete(id);

    return NextResponse.json({ ok: true, message: "Pano silindi." });
  } catch (error) {
    console.error("[DELETE /api/dashboard/:id]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
