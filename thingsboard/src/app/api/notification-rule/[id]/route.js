/**
 * /api/notification-rule/[id] — Tekil Bildirim Kuralı
 *
 * GET    — Detay
 * PUT    — Güncelle
 * DELETE — Sil
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NotificationRule from "@/models/NotificationRule";
import { getSessionUser } from "@/lib/getSessionUser";

// ------------------------------------------------------------------ //
// GET — Kural detayı
// ------------------------------------------------------------------ //
export async function GET(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;

    await connectDB();

    const rule = await NotificationRule.findOne({ _id: id, tenantId }).lean();
    if (!rule) {
      return NextResponse.json(
        { ok: false, message: "Bildirim kuralı bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: rule });
  } catch (error) {
    console.error("[GET /api/notification-rule/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------ //
// PUT — Kural güncelle
// ------------------------------------------------------------------ //
export async function PUT(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const rule = await NotificationRule.findOne({ _id: id, tenantId });
    if (!rule) {
      return NextResponse.json(
        { ok: false, message: "Bildirim kuralı bulunamadı." },
        { status: 404 }
      );
    }

    // Güncellenebilir alanlar
    if (body.name !== undefined) rule.name = body.name;
    if (body.enabled !== undefined) rule.enabled = body.enabled;
    if (body.trigger) rule.trigger = body.trigger;
    if (body.channels) rule.channels = body.channels;
    if (body.template) rule.template = body.template;

    await rule.save();

    return NextResponse.json({ ok: true, data: rule });
  } catch (error) {
    console.error("[PUT /api/notification-rule/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------------ //
// DELETE — Kural sil
// ------------------------------------------------------------------ //
export async function DELETE(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;

    await connectDB();

    const result = await NotificationRule.findOneAndDelete({ _id: id, tenantId });
    if (!result) {
      return NextResponse.json(
        { ok: false, message: "Bildirim kuralı bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: "Bildirim kuralı silindi." });
  } catch (error) {
    console.error("[DELETE /api/notification-rule/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
