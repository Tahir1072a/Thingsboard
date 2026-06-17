"use client";

/**
 * ImageMapWidget — Kat Planı / Image Map Widget
 *
 * 2D plan görüntüsü üzerinde cihaz marker'ları gösterir.
 * SSE ile canlı telemetri verisi alır.
 * Edit modda: görüntü yükleme, marker ekleme/sürükleme/silme.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { Upload, MapPinPlus, Image as ImageIcon } from "lucide-react";

import MapMarker from "./image-map/MapMarker";
import MarkerConfigPanel from "./image-map/MarkerConfigPanel";

export default function ImageMapWidget({
  devices = [],
  keys = [],
  title = "Kat Planı",
  config = {},
  isEditMode = false,
  widgetId,
  onConfigChange,
}) {
  const { imageSrc = "", markers = [] } = config;

  /* ── SSE telemetri değerleri: { "deviceId:key": { value, unit } } ── */
  const [telemetryValues, setTelemetryValues] = useState({});
  const [connected, setConnected] = useState(false);

  /* ── Marker ekleme paneli görünürlüğü ── */
  const [showMarkerPanel, setShowMarkerPanel] = useState(false);

  /* ── Görüntü yükleme durumu ── */
  const [uploading, setUploading] = useState(false);

  /* ── Container ref (drag sınırları + yüzde hesaplama) ── */
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ──────────────────────────────────────────────
   * SSE — Her benzersiz deviceId için bağlantı aç
   * ────────────────────────────────────────────── */
  const uniqueDeviceIds = useMemo(
    () => [...new Set(markers.map((m) => m.deviceId).filter(Boolean))],
    [markers]
  );

  useEffect(() => {
    if (uniqueDeviceIds.length === 0) return;

    let isMounted = true;

    const sources = uniqueDeviceIds.map((id) => {
      const es = new EventSource(
        `/api/sse?deviceId=${encodeURIComponent(id)}`
      );

      es.onopen = () => {
        if (isMounted) setConnected(true);
      };

      es.onerror = () => {
        if (isMounted) setConnected(false);
      };

      es.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(e.data);
          setTelemetryValues((prev) => ({
            ...prev,
            [`${data.deviceId}:${data.key}`]: {
              value: data.value,
              unit: data.unit || "",
            },
          }));
        } catch {
          /* malformed JSON — yoksay */
        }
      };

      return es;
    });

    return () => {
      isMounted = false;
      sources.forEach((es) => es.close());
      setConnected(false);
    };
  }, [uniqueDeviceIds]);

  /* ──────────────────────────────────────────────
   * Config güncelleme yardımcıları
   * ────────────────────────────────────────────── */
  const updateConfig = useCallback(
    (patch) => {
      onConfigChange?.({ ...config, ...patch });
    },
    [config, onConfigChange]
  );

  /* ── Görüntü yükleme ── */
  const handleImageUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();

        if (json.url) {
          updateConfig({ imageSrc: json.url });
        }
      } catch (err) {
        console.error("Görüntü yüklenemedi:", err);
      } finally {
        setUploading(false);
        // Aynı dosyanın tekrar seçilebilmesi için input'u sıfırla
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [updateConfig]
  );

  /* ── Marker ekleme ── */
  const handleAddMarker = useCallback(
    (newMarker) => {
      updateConfig({ markers: [...markers, newMarker] });
      setShowMarkerPanel(false);
    },
    [markers, updateConfig]
  );

  /* ── Marker kaldırma ── */
  const handleRemoveMarker = useCallback(
    (markerId) => {
      updateConfig({
        markers: markers.filter((m) => m.id !== markerId),
      });
    },
    [markers, updateConfig]
  );

  /* ── Marker sürükleme bittiğinde pozisyon güncelle ── */
  const handleMarkerDragEnd = useCallback(
    (markerId, xPos, yPos) => {
      updateConfig({
        markers: markers.map((m) =>
          m.id === markerId ? { ...m, xPos, yPos } : m
        ),
      });
    },
    [markers, updateConfig]
  );

  /* ──────────────────────────────────────────────
   * Render
   * ────────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col">
      {/* ── Üst bar: başlık + durum + edit butonları ── */}
      <div className="flex items-center justify-between mb-2 shrink-0 px-1">
        <h3 className="text-sm font-medium text-slate-500 truncate">
          {title}
        </h3>

        <div className="flex items-center gap-2">
          {/* Canlı bağlantı göstergesi */}
          {uniqueDeviceIds.length > 0 && (
            <span
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                connected ? "text-green-500" : "text-gray-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${
                  connected
                    ? "bg-green-400 shadow-green-400/50 animate-pulse"
                    : "bg-red-400 shadow-red-400/50"
                }`}
              />
              {connected ? "LIVE" : "WAIT"}
            </span>
          )}

          {/* Edit mod butonları */}
          {isEditMode && (
            <>
              {/* Görüntü yükle */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
                  bg-white/60 border border-gray-200 text-text-muted
                  hover:bg-halo-50 hover:border-halo-300 hover:text-halo-600
                  disabled:opacity-40 transition-all"
                title="Plan Yükle"
              >
                <Upload className="h-3 w-3" />
                {uploading ? "Yükleniyor…" : "Plan Yükle"}
              </button>

              {/* Marker ekle */}
              <button
                onClick={() => setShowMarkerPanel((v) => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
                  bg-halo-600 text-white
                  hover:bg-halo-700 transition-colors"
                title="Marker Ekle"
              >
                <MapPinPlus className="h-3 w-3" />
                Marker Ekle
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gizli dosya input'u */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* ── Marker ekleme paneli (overlay) ── */}
      <AnimatePresence>
        {showMarkerPanel && (
          <div className="relative z-30 mb-2">
            <MarkerConfigPanel
              devices={devices}
              onAdd={handleAddMarker}
              onClose={() => setShowMarkerPanel(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* ── Ana görüntü alanı ── */}
      <div
        ref={containerRef}
        className={`
          flex-1 min-h-0 relative overflow-hidden rounded-xl
          ${
            imageSrc
              ? "bg-gray-50/50"
              : "bg-gray-50/30 border-2 border-dashed border-gray-300"
          }
        `}
      >
        {imageSrc ? (
          <>
            {/* Kat planı görüntüsü */}
            <img
              src={imageSrc}
              alt={title}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
            />

            {/* Marker'lar */}
            {markers.map((marker) => {
              const telemetryKey = `${marker.deviceId}:${marker.telemetryKey}`;
              const telemetry = telemetryValues[telemetryKey];
              const displayValue = telemetry?.value;
              const displayUnit = telemetry?.unit || "";

              /* Basit alert: sayısal değer varsa ve eşik aşıldıysa */
              const isAlert =
                typeof displayValue === "number" && displayValue > 100;

              return (
                <MapMarker
                  key={marker.id}
                  marker={marker}
                  value={
                    displayValue !== undefined
                      ? typeof displayValue === "number"
                        ? displayValue.toFixed(1)
                        : String(displayValue)
                      : null
                  }
                  unit={displayUnit}
                  isEditMode={isEditMode}
                  isAlert={isAlert}
                  containerRef={containerRef}
                  onDragEnd={handleMarkerDragEnd}
                  onRemove={handleRemoveMarker}
                />
              );
            })}
          </>
        ) : (
          /* ── Görüntü yok — yer tutucu ── */
          <button
            type="button"
            onClick={() => isEditMode && fileInputRef.current?.click()}
            className={`
              absolute inset-0 flex flex-col items-center justify-center gap-3
              text-text-muted/60
              ${isEditMode ? "cursor-pointer hover:text-halo-500 hover:bg-halo-50/30 transition-colors" : "cursor-default"}
            `}
          >
            <ImageIcon className="h-12 w-12" strokeWidth={1} />
            <span className="text-sm font-medium">
              {isEditMode
                ? "Kat planı yüklemek için tıklayın"
                : "Kat planı yüklenmemiş"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
