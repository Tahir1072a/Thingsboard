/**
 * /api/device/token/generate — Yeni access token üret
 *
 * GET → Rastgele bir access token döndürür (henüz DB'ye kaydetmez).
 * Add Device modal'ında kullanılır.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const token = crypto.randomBytes(32).toString("base64url");

  return NextResponse.json({
    ok: true,
    data: { token },
  });
}
