"use client";

/**
 * Error Boundary — Uygulama Geneli Hata Yakalama
 *
 * Next.js App Router'da herhangi bir sayfa hata verdiğinde
 * beyaz ekran yerine kullanıcı dostu bir hata sayfası gösterilir.
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center space-y-6">
        {/* İkon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        {/* Başlık */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Bir şeyler ters gitti
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
          </p>
        </div>

        {/* Hata detayı (geliştirici modu) */}
        {process.env.NODE_ENV === "development" && error?.message && (
          <div className="bg-gray-50 rounded-lg p-3 text-left">
            <p className="text-xs font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Aksiyon butonları */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-halo-600 text-white text-sm font-medium hover:bg-halo-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tekrar Dene
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Ana Sayfa
          </a>
        </div>
      </div>
    </div>
  );
}
