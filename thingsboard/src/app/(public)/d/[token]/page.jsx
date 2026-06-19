"use client";

/**
 * /d/[token] — Public Pano Görüntüleyici
 *
 * Auth gerektirmez. publicToken ile paylaşılan panoyu
 * salt-okunur modda görüntüler. Widget'lar telemetri
 * verilerini public API üzerinden polling ile alır.
 */

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import WidgetRenderer from "@/components/panels/WidgetRenderer";
import { LayoutDashboard, AlertCircle, Clock, ExternalLink } from "lucide-react";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

export default function PublicDashboardPage() {
  const { token } = useParams();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Container width ölçümü
  const { width: containerWidth, containerRef } = useContainerWidth({ initialWidth: 1200 });

  // ── Dashboard verisini çek ──
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/dashboard/${token}`);
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setError({
            status: res.status,
            message: data.message || "Pano yüklenemedi.",
          });
          return;
        }

        setDashboard(data.data);
      } catch {
        setError({
          status: 500,
          message: "Sunucu hatası. Lütfen daha sonra tekrar deneyin.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [token]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white/80" />
        <p className="text-white/60 text-sm">Pano yükleniyor...</p>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          {error.status === 410 ? (
            <>
              <Clock className="h-12 w-12 mx-auto text-amber-400 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                Paylaşım Süresi Dolmuş
              </h2>
              <p className="text-white/60 text-sm">
                {error.message}
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                Pano Bulunamadı
              </h2>
              <p className="text-white/60 text-sm">
                {error.message}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const layoutData = dashboard.widgets.map((w) => ({
    i: w.i,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: 2,
    minH: 2,
    static: true, // view-only
  }));

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">
                {dashboard.name}
              </h1>
              {dashboard.description && (
                <p className="text-xs text-white/50 leading-tight mt-0.5">
                  {dashboard.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
              <span className="text-xs font-medium text-white/70">Canlı</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Dashboard Grid ── */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-6">
        {dashboard.widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <LayoutDashboard className="h-16 w-16 mb-4" />
            <h3 className="text-lg font-semibold">Bu pano boş</h3>
            <p className="text-sm mt-2">Henüz widget eklenmemiş.</p>
          </div>
        ) : (
          <div ref={containerRef}>
            <ResponsiveGridLayout
              className="layout"
              width={containerWidth}
              layouts={{ lg: layoutData }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={80}
              isDraggable={false}
              isResizable={false}
              compactType="vertical"
              margin={[12, 12]}
            >
              {dashboard.widgets.map((widget) => (
                <div key={widget.i}>
                  <WidgetRenderer
                    widget={widget}
                    isEditMode={false}
                    publicToken={token}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 border-t border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-2 text-white/30 text-xs">
          <span>Almira Things ile oluşturuldu</span>
          <span className="hidden sm:inline">•</span>
          <a
            href={process.env.NEXT_PUBLIC_SITE_URL || "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-white/60 transition-colors"
          >
            almirathings.com
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
