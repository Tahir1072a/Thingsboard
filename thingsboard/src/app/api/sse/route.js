/**
 * /api/sse — Server-Sent Events endpoint
 *
 * Browser bu URL'ye bağlandığında açık bir HTTP akışı başlar.
 * İki event türü yayınlar:
 *   1. "telemetry" — Gerçek zamanlı cihaz telemetrisi
 *   2. "audit-log" — Denetim günlüğü olayları
 *
 * Kullanım (istemci tarafı):
 *   const es = new EventSource('/api/sse?deviceId=xxx')
 *   es.onmessage = (e) => telemetri verisi
 *   es.addEventListener('audit-log', (e) => audit log verisi)
 */

import emitter from "@/lib/event-emitter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Next.js SSE için dynamic zorunlu
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  // Session'dan userId al — SSE bağlantısı sadece auth kullanıcılara açık
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const { searchParams } = new URL(request.url);
  const deviceIdFilter = searchParams.get("deviceId") ?? null;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // İlk bağlantı sinyali
      controller.enqueue(encoder.encode(": connected\n\n"));

      const onTelemetry = (doc) => {
        if (closed) return;

        // User filtresi — sadece kendi cihazlarının verisini gör
        if (userId && doc.userId && String(doc.userId) !== userId) return;

        // Belirli cihaz filtresi varsa diğerlerini atla
        if (deviceIdFilter && String(doc.deviceId) !== deviceIdFilter) return;

        try {
          const payload = JSON.stringify({
            deviceId: String(doc.deviceId),
            key: doc.key,
            value: doc.value,
            unit: doc.unit,
            protocol: doc.protocol,
            timestamp: doc.timestamp,
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // stream kapandıysa sessizce geç
        }
      };

      emitter.on("telemetry", onTelemetry);

      // ── Audit log event listener ──
      const onAuditLog = (log) => {
        if (closed) return;
        // User filtresi — sadece kendi loglarını gör
        if (userId && log.userId && String(log.userId) !== userId) return;

        try {
          const payload = JSON.stringify(log);
          controller.enqueue(encoder.encode(`event: audit-log\ndata: ${payload}\n\n`));
        } catch {
          // stream kapalıysa sessizce geç
        }
      };

      emitter.on("audit-log", onAuditLog);

      // ── Alarm event listener ──
      const onAlarm = (alarm) => {
        if (closed) return;
        // User filtresi — sadece kendi alarmlarını gör
        if (userId && alarm.userId && String(alarm.userId) !== userId) return;

        // Belirli cihaz filtresi varsa diğerlerini atla
        if (deviceIdFilter && String(alarm.deviceId) !== deviceIdFilter) return;

        try {
          const payload = JSON.stringify({ type: "alarm", ...alarm });
          controller.enqueue(encoder.encode(`event: alarm\ndata: ${payload}\n\n`));
        } catch {
          // stream kapalıysa sessizce geç
        }
      };

      emitter.on("alarm", onAlarm);

      // Keep-alive ping (30 sn'de bir — proxy/nginx timeout'larını önler)
      const pingInterval = setInterval(() => {
        if (closed) {
          clearInterval(pingInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30_000);

      // İstemci bağlantıyı kapattığında temizle
      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(pingInterval);
        emitter.off("telemetry", onTelemetry);
        emitter.off("audit-log", onAuditLog);
        emitter.off("alarm", onAlarm);
        try {
          controller.close();
        } catch {
          // zaten kapalı
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx proxy buffer'ını kapat
    },
  });
}
