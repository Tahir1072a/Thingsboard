/**
 * /api/v1/[accessToken]/rpc — Cihaz tarafı RPC endpoint'i
 *
 * GET  — Bekleyen RPC komutlarını çek (cihaz polling)
 * POST — Cihaz RPC yanıtı gönder (client-side → server)
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Device from "@/models/Device";
import RpcRequest from "@/models/RpcRequest";

// ── GET — Bekleyen RPC komutlarını çek (cihaz polling) ──
export async function GET(request, { params }) {
  try {
    const { accessToken } = await params;

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

    // Bekleyen RPC komutlarını çek (PENDING + QUEUED)
    const pendingRpcs = await RpcRequest.find({
      deviceId: device._id,
      status: { $in: ["PENDING", "QUEUED"] },
      direction: "SERVER_TO_DEVICE",
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .lean();

    // Expire olmuş persistent RPC'leri temizle
    const now = new Date();
    const validRpcs = [];
    for (const rpc of pendingRpcs) {
      if (rpc.expirationTime && new Date(rpc.expirationTime) < now) {
        await RpcRequest.updateOne(
          { _id: rpc._id },
          { status: "EXPIRED", completedAt: now, errorMessage: "Süre aşımı." }
        );
      } else {
        validRpcs.push(rpc);
      }
    }

    // QUEUED → PENDING (teslim edildi olarak işaretle)
    const queuedIds = validRpcs
      .filter((r) => r.status === "QUEUED")
      .map((r) => r._id);
    if (queuedIds.length > 0) {
      await RpcRequest.updateMany(
        { _id: { $in: queuedIds } },
        { status: "PENDING" }
      );
    }

    // Cihaz için düzenlenmiş formatla döndür
    const commands = validRpcs.map((rpc) => ({
      requestId: rpc.requestId,
      method: rpc.method,
      params: rpc.params || {},
      oneWay: rpc.oneWay || false,
    }));

    return NextResponse.json({
      ok: true,
      count: commands.length,
      data: commands,
    });
  } catch (error) {
    console.error("[GET /api/v1/:token/rpc]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

// ── POST — Cihaz RPC yanıtı gönder ──
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
