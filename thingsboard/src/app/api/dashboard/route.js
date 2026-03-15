/**
 * /api/dashboard — Pano listeleme ve oluşturma
 *
 * GET  → Kullanıcının panolarını listele
 * POST → Yeni pano oluştur
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import Dashboard from "@/models/Dashboard";

// ------------------------------------------------------------------ //
// GET — Kullanıcının panolarını listele
// ------------------------------------------------------------------ //
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
    }

    await connectDB();

    const dashboards = await Dashboard.find({ ownerId: session.user.id })
      .sort({ updatedAt: -1 })
      .select("name description widgets createdAt updatedAt")
      .lean();

    return NextResponse.json({
      ok: true,
      data: dashboards.map((d) => ({
        ...d,
        widgetCount: d.widgets?.length || 0,
      })),
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

// ------------------------------------------------------------------ //
// POST — Yeni pano oluştur
// ------------------------------------------------------------------ //
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "Pano adı zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    const dashboard = await Dashboard.create({
      name,
      description: description || "",
      ownerId: session.user.id,
      widgets: [],
    });

    return NextResponse.json(
      { ok: true, message: "Pano oluşturuldu.", data: dashboard.toObject() },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/dashboard]", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
