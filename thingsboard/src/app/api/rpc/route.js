/**
 * /api/rpc — Server-side RPC
 *
 * POST — Cihaza RPC komutu gönder
 * GET  — Tenant'ın RPC geçmişi (sayfalı, filtrelenebilir)
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import RpcRequest from "@/models/RpcRequest";
import Device from "@/models/Device";
import emitter from "@/lib/event-emitter";
import { getSessionUser } from "@/lib/getSessionUser";

// ── POST — Cihaza RPC gönder ──
export async function POST(request) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const body = await request.json();

    if (!body.deviceId || !body.method) {
      return NextResponse.json(
        { ok: false, message: "deviceId ve method zorunludur." },
        { status: 400 }
      );
    }

    await connectDB();

    // Cihaz kontrolü
    const device = await Device.findOne({ _id: body.deviceId, tenantId });
    if (!device) {
      return NextResponse.json(
        { ok: false, message: "Cihaz bulunamadı." },
        { status: 404 }
      );
    }

    const oneWay = body.oneWay || false;
    const persistent = body.persistent || false;
    const retries = body.retries || 0;

    // Persistent RPC: cihaz offline ise QUEUED, değilse PENDING
    let initialStatus = "PENDING";
    if (persistent) {
      initialStatus = "QUEUED";
    }

    const rpcData = {
      tenantId,
      deviceId: body.deviceId,
      direction: "SERVER_TO_DEVICE",
      method: body.method,
      params: body.params || {},
      timeout: body.timeout || 10000,
      oneWay,
      persistent,
      status: initialStatus,
    };

    // Persistent RPC: expiration ve retry ayarları
    if (persistent) {
      const ttlMs = body.expirationMs || 24 * 60 * 60 * 1000; // varsayılan 24 saat
      rpcData.expirationTime = new Date(Date.now() + ttlMs);
      rpcData.retries = retries;
      rpcData.retriesLeft = retries;
    }

    const rpc = await RpcRequest.create(rpcData);

    // MQTT/WS üzerinden cihaza ilet (event-emitter ile)
    // Persistent RPC'de kuyrukta kalır, server.mjs cihaz bağlandığında gönderir
    if (!persistent) {
      emitter.emit("rpc:request", {
        requestId: rpc.requestId,
        deviceId: body.deviceId,
        accessToken: device.accessToken,
        method: body.method,
        params: body.params || {},
        timeout: body.timeout || 10000,
        oneWay,
      });
    }

    // Timeout kontrolü — oneWay ve persistent RPC'lerde timeout uygulanmaz
    if (!oneWay && !persistent) {
      setTimeout(async () => {
        try {
          await connectDB();
          const req = await RpcRequest.findOne({ requestId: rpc.requestId });
          if (req && req.status === "PENDING") {
            req.status = "TIMEOUT";
            req.completedAt = new Date();
            req.errorMessage = "Cihaz yanıt vermedi (timeout).";
            await req.save();
          }
        } catch {}
      }, body.timeout || 10000);
    }

    return NextResponse.json({ ok: true, data: rpc }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/rpc]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

// ── GET — RPC geçmişi (sayfalı, filtrelenebilir) ──
export async function GET(request) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const status = searchParams.get("status");
    const direction = searchParams.get("direction");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    await connectDB();

    const filter = { tenantId };
    if (deviceId) filter.deviceId = deviceId;
    if (status) filter.status = status;
    if (direction) filter.direction = direction;

    const total = await RpcRequest.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;

    const data = await RpcRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      ok: true,
      data,
      pagination: {
        total,
        page,
        totalPages,
        limit,
      },
    });
  } catch (error) {
    console.error("[GET /api/rpc]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

// ── DELETE — RPC iptal / temizle ──
export async function DELETE(request) {
  try {
    const { userId, tenantId } = await getSessionUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action") || "cancel"; // cancel | cleanExpired

    await connectDB();

    if (action === "cleanExpired") {
      // Süresi dolmuş persistent RPC'leri temizle
      const result = await RpcRequest.updateMany(
        {
          tenantId,
          status: "QUEUED",
          expirationTime: { $lt: new Date() },
        },
        { status: "EXPIRED", completedAt: new Date(), errorMessage: "Süre doldu." }
      );
      return NextResponse.json({
        ok: true,
        message: `${result.modifiedCount} adet süresi dolmuş RPC temizlendi.`,
      });
    }

    // Tekil RPC iptal
    if (!id) {
      return NextResponse.json(
        { ok: false, message: "id parametresi zorunludur." },
        { status: 400 }
      );
    }

    const rpc = await RpcRequest.findOne({ _id: id, tenantId });
    if (!rpc) {
      return NextResponse.json(
        { ok: false, message: "RPC bulunamadı." },
        { status: 404 }
      );
    }

    if (rpc.status !== "QUEUED" && rpc.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, message: "Sadece QUEUED veya PENDING durumundaki RPC'ler iptal edilebilir." },
        { status: 400 }
      );
    }

    rpc.status = "ERROR";
    rpc.completedAt = new Date();
    rpc.errorMessage = "Kullanıcı tarafından iptal edildi.";
    await rpc.save();

    return NextResponse.json({ ok: true, message: "RPC iptal edildi." });
  } catch (error) {
    console.error("[DELETE /api/rpc]", error.message);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
