"use client";

/**
 * MapWidget — Gerçek harita widget'ı (Leaflet + OpenStreetMap)
 *
 * Cihaz konumlarını harita üzerinde marker'lar ile gösterir.
 * SSE/polling ile gerçek zamanlı güncelleme.
 * Zone/Polygon desteği: Asset API'den ZONE tipleri + widget config zone'ları.
 * Next.js SSR uyumluluğu: dynamic import ile ssr: false.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

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
  const [zones, setZones] = useState([]);
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

  // ── Zone'ları Asset API'den çek (type=ZONE) ──
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch("/api/asset?type=ZONE&limit=100");
        const data = await res.json();
        if (data.ok) {
          setZones(
            (data.data || [])
              .filter((a) => a.polygon && a.polygon.length >= 3)
              .map((a) => ({
                id: a._id,
                name: a.name,
                color: a.zoneConfig?.color || "#6941c6",
                opacity: a.zoneConfig?.opacity || 0.25,
                borderColor: a.zoneConfig?.borderColor || "#6941c6",
                borderWidth: a.zoneConfig?.borderWidth || 2,
                coordinates: a.polygon.map((p) => [p.lat, p.lng]),
              }))
          );
        }
      } catch (err) {
        console.error("Zone fetch error:", err);
      }
    };
    fetchZones();
  }, []);

  // Widget config'deki inline zone'lar (edit modunda çizilenler)
  const configZones = (config.zones || []).map((z, i) => ({
    id: `config-${i}`,
    name: z.name || `Bölge ${i + 1}`,
    color: z.color || "#22c55e",
    opacity: z.opacity || 0.2,
    borderColor: z.borderColor || "#22c55e",
    borderWidth: z.borderWidth || 2,
    coordinates: z.coordinates || [],
  }));

  const allZones = [...zones, ...configZones];

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

  // ── Zone çizim callback ──
  const handleZoneCreated = useCallback(
    (coords) => {
      const newZone = {
        name: `Bölge ${(config.zones?.length || 0) + 1}`,
        coordinates: coords,
        color: "#22c55e",
        opacity: 0.2,
        borderColor: "#22c55e",
        borderWidth: 2,
      };
      handleConfigChange({
        zones: [...(config.zones || []), newZone],
      });
    },
    [config, handleConfigChange]
  );

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
        zones={allZones}
        isEditMode={isEditMode}
        onZoneCreated={isEditMode ? handleZoneCreated : undefined}
      />

      {/* Marker + Zone sayısı badge */}
      <div className="absolute top-2 right-2 z-[1000] bg-bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1 text-xs text-text-muted space-y-0.5">
        <div>📍 {markers.length} / {devices.length} cihaz</div>
        {allZones.length > 0 && (
          <div>📐 {allZones.length} bölge</div>
        )}
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

          {/* Zone listesi */}
          {allZones.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-[10px] font-semibold text-text-muted mb-1">📐 Bölgeler</p>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {allZones.map((z, i) => (
                  <div key={z.id} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-sm border border-white/30"
                        style={{ background: z.color }}
                      />
                      <span className="text-text-main">{z.name}</span>
                    </div>
                    {z.id?.startsWith("config-") && (
                      <button
                        onClick={() => {
                          const idx = parseInt(z.id.replace("config-", ""), 10);
                          const updated = [...(config.zones || [])];
                          updated.splice(idx, 1);
                          handleConfigChange({ zones: updated });
                        }}
                        className="text-red-400 hover:text-red-600 px-1"
                        title="Bölgeyi sil"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEditMode && (
            <p className="text-[9px] text-text-light mt-1.5 italic">
              💡 Bölge çizmek için sağ üstteki çizim araçlarını kullanın
            </p>
          )}
        </div>
      )}
    </div>
  );
}
