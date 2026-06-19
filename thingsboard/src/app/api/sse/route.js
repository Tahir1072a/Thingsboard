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
import { getSessionUser } from "@/lib/getSessionUser";

// Next.js SSE için dynamic zorunlu
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  // Session'dan tenantId al — SSE bağlantısı sadece auth kullanıcılara açık
  let tenantId = null;
  try {
    const session = await getSessionUser();
    tenantId = session.tenantId ?? null;
  } catch {
    // Session yoksa tenantId null kalır
  }

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

        // Tenant filtresi — sadece kendi tenant'ının cihaz verisini gör
        if (tenantId && doc.tenantId && String(doc.tenantId) !== tenantId) return;

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
        // Tenant filtresi — sadece kendi tenant'ının loglarını gör
        if (tenantId && log.tenantId && String(log.tenantId) !== tenantId) return;

        try {
          const payload = JSON.stringify(log);
          // Named SSE event: frontend'de addEventListener('audit-log', ...) ile dinlenir
          controller.enqueue(encoder.encode(`event: audit-log\ndata: ${payload}\n\n`));
        } catch {
          // stream kapalıysa sessizce geç
        }
      };

      emitter.on("audit-log", onAuditLog);

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
