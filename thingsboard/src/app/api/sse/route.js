/**
 * /api/sse — Server-Sent Events endpoint
 *
 * Browser bu URL'ye bağlandığında açık bir HTTP akışı başlar.
 * Yeni telemetri verisi geldiğinde (handleTelemetry çağrıldığında)
 * singleton emitter "telemetry" eventini yayınlar ve bu endpoint
 * veriyi bağlı tüm istemcilere iletir.
 *
 * Kullanım (istemci tarafı):
 *   const es = new EventSource('/api/sse?deviceId=xxx')
 *   es.onmessage = (e) => { const data = JSON.parse(e.data) }
 */

import emitter from "@/lib/event-emitter";

// Next.js SSE için dynamic zorunlu
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  // isteğe bağlı: belirli bir cihazı izlemek için
  const deviceIdFilter = searchParams.get("deviceId") ?? null;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // İlk bağlantı sinyali
      controller.enqueue(encoder.encode(": connected\n\n"));

      const onTelemetry = (doc) => {
        if (closed) return;

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
