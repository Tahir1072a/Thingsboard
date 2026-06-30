/**
 * /api/device/[id]/token — Cihaz Token Yönetimi
 *
 * POST — Cihaza yeni token oluştur/yenile
 *   - X509 cihazlar için ilk defa token oluşturma
 *   - Token'ı kaybetmiş cihazlar için yenileme
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import Device from "@/models/Device";
import { getSessionUser } from "@/lib/getSessionUser";
import { auditDeviceAction } from "@/lib/audit-service";

export async function POST(request, { params }) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { id } = await params;

    await connectDB();

    const device = await Device.findOne({ _id: id, tenantId });
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Cihaz bulunamadı veya erişim yetkiniz yok." },
        { status: 404 }
      );
    }

    // Sadece token'ı olmayan cihazlara izin ver (X509 cihazlar)
    // veya force=true ile yenileme
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    if (device.accessToken && !force) {
      return NextResponse.json(
        { ok: false, message: "Bu cihazın zaten bir token'ı var. Yenilemek için force: true gönderin." },
        { status: 400 }
      );
    }

    // Yeni token oluştur
    const newToken = crypto.randomBytes(32).toString("base64url");
    device.accessToken = newToken;
    await device.save();

    // Audit log
    auditDeviceAction(
      userId,
      "DEVICE_TOKEN_GENERATED",
      device.toObject(),
      { hasExistingToken: !!device.accessToken, forced: force },
      tenantId
    );

    return NextResponse.json({
      ok: true,
      message: force ? "Token yenilendi." : "Token oluşturuldu.",
      data: { accessToken: newToken },
    });
  } catch (error) {
    console.error("[POST /api/device/:id/token]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
