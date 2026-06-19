/**
 * /api/device/[id]/attributes — Cihaz Öznitelik CRUD
 *
 * GET  ?scope=SERVER_SCOPE  — Belirtilen scope'daki attribute'ları listele
 * POST { scope, key, value } veya { scope, attributes: { key: value, ... } }
 * DELETE { scope, keys: ["key1", "key2"] }
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Device from "@/models/Device";
import Attribute from "@/models/Attribute";
import { getSessionUser } from "@/lib/getSessionUser";

const VALID_SCOPES = ["CLIENT_SCOPE", "SERVER_SCOPE", "SHARED_SCOPE"];

// ------------------------------------------------------------------ //
// GET — Attribute'ları listele
// ------------------------------------------------------------------ //
export async function GET(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id: deviceId } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "SERVER_SCOPE";

    if (!VALID_SCOPES.includes(scope)) {
      return NextResponse.json(
        { ok: false, message: `Geçersiz scope. Olası değerler: ${VALID_SCOPES.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Cihazın bu tenant'a ait olduğunu doğrula
    const device = await Device.findOne({ _id: deviceId, tenantId }).lean();
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Cihaz bulunamadı veya erişim yetkiniz yok." },
        { status: 403 }
      );
    }

    const attributes = await Attribute.getByScope(deviceId, scope);

    return NextResponse.json({
      ok: true,
      scope,
      count: attributes.length,
      data: attributes,
    });
  } catch (error) {
    console.error("[GET /api/device/:id/attributes]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}

// ------------------------------------------------------------------ //
// POST — Attribute ekle/güncelle
// Tekil: { scope, key, value }
// Çoklu: { scope, attributes: { key1: value1, key2: value2 } }
// ------------------------------------------------------------------ //
export async function POST(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id: deviceId } = await params;
    const body = await request.json();

    const { scope, key, value, attributes } = body;

    if (!scope || !VALID_SCOPES.includes(scope)) {
      return NextResponse.json(
        { ok: false, message: `scope zorunludur. Olası değerler: ${VALID_SCOPES.join(", ")}` },
        { status: 400 }
      );
    }

    // CLIENT_SCOPE'a platform tarafından yazılamaz
    if (scope === "CLIENT_SCOPE") {
      return NextResponse.json(
        { ok: false, message: "CLIENT_SCOPE attribute'ları sadece cihaz tarafından gönderilebilir." },
        { status: 403 }
      );
    }

    await connectDB();

    // Cihazın bu tenant'a ait olduğunu doğrula
    const device = await Device.findOne({ _id: deviceId, tenantId }).lean();
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Cihaz bulunamadı veya erişim yetkiniz yok." },
        { status: 403 }
      );
    }

    // Çoklu attribute
    if (attributes && typeof attributes === "object") {
      const result = await Attribute.upsertMany(tenantId, deviceId, scope, attributes);
      return NextResponse.json({
        ok: true,
        message: `${Object.keys(attributes).length} attribute güncellendi.`,
        data: result,
      });
    }

    // Tekil attribute
    if (!key) {
      return NextResponse.json(
        { ok: false, message: "key zorunludur." },
        { status: 400 }
      );
    }

    if (value === undefined || value === null) {
      return NextResponse.json(
        { ok: false, message: "value zorunludur." },
        { status: 400 }
      );
    }

    const result = await Attribute.upsertAttribute(tenantId, deviceId, scope, key, value);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error("[POST /api/device/:id/attributes]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}

// ------------------------------------------------------------------ //
// DELETE — Attribute sil
// Body: { scope, keys: ["key1", "key2"] }
// ------------------------------------------------------------------ //
export async function DELETE(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id: deviceId } = await params;
    const body = await request.json();

    const { scope, keys } = body;

    if (!scope || !VALID_SCOPES.includes(scope)) {
      return NextResponse.json(
        { ok: false, message: `scope zorunludur. Olası değerler: ${VALID_SCOPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (scope === "CLIENT_SCOPE") {
      return NextResponse.json(
        { ok: false, message: "CLIENT_SCOPE attribute'ları platform tarafından silinemez." },
        { status: 403 }
      );
    }

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { ok: false, message: "keys dizisi zorunludur ve en az bir eleman içermelidir." },
        { status: 400 }
      );
    }

    await connectDB();

    // Cihazın bu tenant'a ait olduğunu doğrula
    const device = await Device.findOne({ _id: deviceId, tenantId }).lean();
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Cihaz bulunamadı veya erişim yetkiniz yok." },
        { status: 403 }
      );
    }

    const result = await Attribute.deleteKeys(tenantId, deviceId, scope, keys);

    return NextResponse.json({
      ok: true,
      message: `${result.deletedCount} attribute silindi.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("[DELETE /api/device/:id/attributes]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}
