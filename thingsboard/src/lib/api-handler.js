/**
 * api-handler.js — Merkezi API Hata Yönetimi
 *
 * Tüm API route handler'larını saran wrapper fonksiyon.
 * - Tutarlı JSON yanıt formatı sağlar
 * - Mongoose ValidationError → 400
 * - Unauthorized → 401
 * - Genel hata → 500
 * - Her hatayı loglar
 */

import { NextResponse } from "next/server";
import logger from "./logger.js";

/**
 * API route handler'ını hata yönetimi ile sarar.
 *
 * Kullanım:
 *   export const GET = withErrorHandler(async (request) => {
 *     // ... iş mantığı
 *     return NextResponse.json({ ok: true, data });
 *   });
 */
export function withErrorHandler(handler, routeName = "API") {
  return async function wrappedHandler(request, context) {
    try {
      return await handler(request, context);
    } catch (error) {
      logger.error(
        { err: error, route: routeName, method: request.method, url: request.url },
        `[${routeName}] İşlenmeyen hata`
      );

      // Mongoose doğrulama hatası
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((e) => e.message);
        return NextResponse.json(
          { ok: false, message: "Doğrulama hatası.", errors: messages },
          { status: 400 }
        );
      }

      // Mongoose CastError (geçersiz ObjectId vb.)
      if (error.name === "CastError") {
        return NextResponse.json(
          { ok: false, message: "Geçersiz parametre formatı." },
          { status: 400 }
        );
      }

      // Özel hata kodları
      if (error.statusCode) {
        return NextResponse.json(
          { ok: false, message: error.message },
          { status: error.statusCode }
        );
      }

      // Genel sunucu hatası
      return NextResponse.json(
        { ok: false, message: "Sunucu hatası. Lütfen daha sonra tekrar deneyin." },
        { status: 500 }
      );
    }
  };
}
