/**
 * event-emitter.js
 *
 * Tüm uygulama boyunca paylaşılan singleton EventEmitter.
 * server.js (MQTT / WebSocket alıcıları) ve /api/telemetry (HTTP alıcısı)
 * bu emitter üzerinden yeni telemetri verilerini yayınlar.
 * /api/sse endpoint'i ise bu emitter'ı dinleyerek bağlı browser'lara push gönderir.
 *
 * Not: Next.js'in hot-reload'u sırasında birden fazla instance oluşmasını
 * engellemek için global nesneye kaydediyoruz.
 */

import { EventEmitter } from "events";

const globalKey = "__telemetry_emitter__";

/** @type {EventEmitter} */
const emitter = global[globalKey] ?? new EventEmitter();

if (!global[globalKey]) {
  emitter.setMaxListeners(200);
  global[globalKey] = emitter;
}

export default emitter;
