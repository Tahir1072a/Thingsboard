/**
 * /api/v1/[accessToken]/rpc — Cihaz tarafı RPC yanıt endpoint'i
 *
 * POST — Cihaz RPC yanıtı gönder (client-side → server)
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Device from "@/models/Device";
import RpcRequest from "@/models/RpcRequest";

export async function POST(request, { params }) {
  try {
    const { accessToken } = await params;
    const body = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Access token zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();
    const device = await Device.findByToken(accessToken);
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Geçersiz access token." },
        { status: 401 }
      );
    }

    if (!body.requestId) {
      return NextResponse.json(
        { ok: false, message: "requestId zorunludur." },
        { status: 400 }
      );
    }

    // RPC isteğini bul ve yanıtla güncelle
    const rpc = await RpcRequest.findOne({
      requestId: body.requestId,
      deviceId: device._id,
    });

    if (!rpc) {
      return NextResponse.json(
        { ok: false, message: "RPC isteği bulunamadı." },
        { status: 404 }
      );
    }

    rpc.status = body.error ? "ERROR" : "SUCCESS";
    rpc.response = body.response || body.result || null;
    rpc.errorMessage = body.error || "";
    rpc.completedAt = new Date();
    await rpc.save();

    return NextResponse.json({ ok: true, data: rpc });
  } catch (error) {
    console.error("[POST /api/v1/:token/rpc]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
