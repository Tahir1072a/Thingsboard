/**
 * /api/asset/[id] — Tekil Asset işlemleri
 *
 * GET    — Asset detay
 * PUT    — Asset güncelle
 * DELETE — Asset sil
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Asset from "@/models/Asset";
import { getSessionUser } from "@/lib/getSessionUser";

export async function GET(request, { params }) {
  try {
    const { tenantId } = await getSessionUser();
    const { id } = await params;

    await connectDB();
    const asset = await Asset.findOne({ _id: id, tenantId }).lean();

    if (!asset) {
      return NextResponse.json(
        { ok: false, message: "Varlık bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: asset });
  } catch (error) {
    console.error("[GET /api/asset/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { tenantId } = await getSessionUser();
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    const asset = await Asset.findOne({ _id: id, tenantId });
    if (!asset) {
      return NextResponse.json(
        { ok: false, message: "Varlık bulunamadı." },
        { status: 404 }
      );
    }

    // Güncellenebilir alanlar
    if (body.name !== undefined) asset.name = body.name;
    if (body.type !== undefined) asset.type = body.type;
    if (body.label !== undefined) asset.label = body.label;
    if (body.description !== undefined) asset.description = body.description;
    if (body.polygon !== undefined) asset.polygon = body.polygon;
    if (body.zoneConfig !== undefined) asset.zoneConfig = { ...asset.zoneConfig?.toObject?.() || {}, ...body.zoneConfig };
    if (body.relations !== undefined) asset.relations = body.relations;
    if (body.additionalInfo !== undefined) asset.additionalInfo = body.additionalInfo;

    await asset.save();

    return NextResponse.json({ ok: true, data: asset });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { ok: false, message: "Bu isimde bir varlık zaten mevcut." },
        { status: 409 }
      );
    }
    console.error("[PUT /api/asset/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { tenantId } = await getSessionUser();
    const { id } = await params;

    await connectDB();
    const asset = await Asset.findOneAndDelete({ _id: id, tenantId });

    if (!asset) {
      return NextResponse.json(
        { ok: false, message: "Varlık bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: "Varlık silindi." });
  } catch (error) {
    console.error("[DELETE /api/asset/:id]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
