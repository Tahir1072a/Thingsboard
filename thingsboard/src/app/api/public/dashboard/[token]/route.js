/**
 * /api/public/dashboard/[token] — Public pano görüntüleme
 *
 * GET → Auth gerektirmez. publicToken ile pano verisini döner.
 *       Süresi dolmuşsa 410 Gone döner.
 *       Güvenlik için ownerId ve tenantId strip edilir.
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Dashboard from "@/models/Dashboard";

export async function GET(request, { params }) {
  try {
    const { token } = await params;

    await connectDB();
    const dashboard = await Dashboard.findOne({
      publicToken: token,
      isPublic: true,
    }).lean();

    if (!dashboard) {
      return NextResponse.json(
        { ok: false, message: "Pano bulunamadı veya paylaşım kapalı." },
        { status: 404 }
      );
    }

    // Süre kontrolü
    if (
      dashboard.shareSettings?.expiresAt &&
      new Date(dashboard.shareSettings.expiresAt) < new Date()
    ) {
      return NextResponse.json(
        { ok: false, message: "Bu paylaşım bağlantısının süresi dolmuş." },
        { status: 410 }
      );
    }

    // Tüm widget'lardan benzersiz device ID'lerini çıkar
    const deviceSet = new Set();
    const keySet = new Set();
    (dashboard.widgets || []).forEach((widget) => {
      (widget.devices || []).forEach((d) => {
        if (d.id) deviceSet.add(d.id);
      });
      (widget.keys || []).forEach((k) => {
        keySet.add(k);
      });
      // image_map marker'larındaki cihazları da ekle
      if (widget.config?.markers) {
        widget.config.markers.forEach((m) => {
          if (m.deviceId) deviceSet.add(m.deviceId);
          if (m.telemetryKey) keySet.add(m.telemetryKey);
        });
      }
    });

    // Güvenlik: hassas alanları strip et
    const {
      ownerId,
      tenantId,
      __v,
      ...safeDashboard
    } = dashboard;

    return NextResponse.json({
      ok: true,
      data: {
        ...safeDashboard,
        devices: Array.from(deviceSet),
        allowedKeys: Array.from(keySet),
      },
    });
  } catch (error) {
    console.error("[GET /api/public/dashboard/:token]", error);
    return NextResponse.json(
      { ok: false, message: "Sunucu hatası." },
      { status: 500 }
    );
  }
}
