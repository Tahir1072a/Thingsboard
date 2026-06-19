"use client";

/**
 * MapWidget — Gerçek harita widget'ı (Leaflet + OpenStreetMap)
 *
 * Cihaz konumlarını harita üzerinde marker'lar ile gösterir.
 * SSE/polling ile gerçek zamanlı güncelleme.
 * Next.js SSR uyumluluğu: dynamic import ile ssr: false.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

// Leaflet'i SSR-safe dynamic import ile yükle
const LeafletMap = dynamic(() => import("./geo-map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-text-muted">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs">Harita yükleniyor...</span>
      </div>
    </div>
  ),
});

export default function MapWidget({
  devices = [],
  keys = [],
  title,
  config = {},
  isEditMode,
  widgetId,
  onConfigChange,
  publicToken,
}) {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const {
    defaultCenter = { lat: 41.0082, lng: 28.9784 },
    defaultZoom = 10,
    latitudeKey = "latitude",
    longitudeKey = "longitude",
    showTooltips = true,
    fitBounds = true,
  } = config;

  // ── Cihaz konumlarını telemetriden çek ──
  const fetchLocations = useCallback(async () => {
    if (!devices || devices.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const newMarkers = [];

      for (const device of devices) {
        const deviceId = device.id || device._id;
        if (!deviceId) continue;

        const baseUrl = publicToken
          ? `/api/public/telemetry/${publicToken}`
          : `/api/telemetry`;

        const params = new URLSearchParams({
          deviceId,
          latest: "true",
        });

        const res = await fetch(`${baseUrl}?${params}`);
        const json = await res.json();

        if (json.ok && json.data) {
          const latEntry = json.data.find((d) => d.key === latitudeKey);
          const lngEntry = json.data.find((d) => d.key === longitudeKey);

          if (latEntry && lngEntry) {
            const lat = parseFloat(latEntry.value);
            const lng = parseFloat(lngEntry.value);

            if (!isNaN(lat) && !isNaN(lng)) {
              // Ek telemetri bilgileri
              const extraData = {};
              json.data
                .filter((d) => d.key !== latitudeKey && d.key !== longitudeKey)
                .forEach((d) => {
                  extraData[d.key] = d.value;
                });

              newMarkers.push({
                id: deviceId,
                name: device.name || device.label || "Cihaz",
                lat,
                lng,
                extraData,
                lastUpdate: latEntry.timestamp,
              });
            }
          }
        }
      }

      setMarkers(newMarkers);
    } catch (err) {
      console.error("Map fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [devices, publicToken, latitudeKey, longitudeKey]);

  useEffect(() => {
    fetchLocations();

    // Polling: 15 saniyede bir güncelle
    intervalRef.current = setInterval(fetchLocations, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchLocations]);

  // ── Edit mode config ──
  const handleConfigChange = (newConfig) => {
    if (onConfigChange) {
      onConfigChange(widgetId, { ...config, ...newConfig });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-xs">Konum verileri yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <div className="text-center">
          <span className="text-2xl">🗺️</span>
          <p className="text-sm mt-2">Cihaz seçilmedi</p>
          <p className="text-xs mt-1">Edit modunda cihaz ekleyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <LeafletMap
        markers={markers}
        center={defaultCenter}
        zoom={defaultZoom}
        showTooltips={showTooltips}
        fitBounds={fitBounds && markers.length > 0}
      />

      {/* Marker sayısı badge */}
      <div className="absolute top-2 right-2 z-[1000] bg-bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1 text-xs text-text-muted">
        📍 {markers.length} / {devices.length} cihaz
      </div>

      {/* Edit mode config panel */}
      {isEditMode && (
        <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-text-muted">Enlem Key</label>
              <input
                type="text"
                value={latitudeKey}
                onChange={(e) =>
                  handleConfigChange({ latitudeKey: e.target.value })
                }
                className="w-full mt-0.5 px-2 py-1 bg-bg-surface border border-border rounded text-text-main text-xs"
              />
            </div>
            <div>
              <label className="text-text-muted">Boylam Key</label>
              <input
                type="text"
                value={longitudeKey}
                onChange={(e) =>
                  handleConfigChange({ longitudeKey: e.target.value })
                }
                className="w-full mt-0.5 px-2 py-1 bg-bg-surface border border-border rounded text-text-main text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
