"use client";

/**
 * MapWidget — Gerçek harita widget'ı (Leaflet + OpenStreetMap)
 *
 * Cihaz konumlarını harita üzerinde marker'lar ile gösterir.
 * SSE/polling ile gerçek zamanlı güncelleme.
 * Zone/Polygon desteği: Asset API'den ZONE tipleri + widget config zone'ları.
 * Manuel marker desteği: Edit modunda haritaya tek nokta marker ekleme.
 * Next.js SSR uyumluluğu: dynamic import ile ssr: false.
 *
 * Authenticated modda useMultiTelemetrySSE ile canlı konum güncellemesi,
 * public modda 15s polling korunur.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { MapPin, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useMultiTelemetrySSE } from "@/lib/sse-pool";

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
  const [telemetryValues, setTelemetryValues] = useState({});
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [editingZoneName, setEditingZoneName] = useState("");
  const [editingMarkerId, setEditingMarkerId] = useState(null);
  const [editingMarkerName, setEditingMarkerName] = useState("");
  const intervalRef = useRef(null);
  const leafletRef = useRef(null);

  const {
    defaultCenter = { lat: 41.0082, lng: 28.9784 },
    defaultZoom = 10,
    latitudeKey = "latitude",
    longitudeKey = "longitude",
    showTooltips = true,
    fitBounds = true,
    tileLayer = "osm",
    manualMarkers = [],
  } = config;

  const isPublic = !!publicToken;
  const deviceIds = devices.map((d) => d.id || d._id).filter(Boolean);

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
    borderColor: z.borderColor || z.color || "#22c55e",
    borderWidth: z.borderWidth || 2,
    coordinates: z.coordinates || [],
    deviceId: z.deviceId || null,
    deviceName: z.deviceName || "",
    telemetryKey: z.telemetryKey || null,
    type: "Widget",
  }));

  const allZones = [...zones, ...configZones];

  // ── Zone/Marker'a atanmış cihazların telemetrisini SSE ile dinle ──
  const assignedDeviceIds = [
    ...(config.zones || []).filter(z => z.deviceId).map(z => z.deviceId),
    ...manualMarkers.filter(m => m.deviceId).map(m => m.deviceId),
  ].filter((id, idx, arr) => arr.indexOf(id) === idx); // unique

  const handleAssignedSSEData = useCallback((telemetryData) => {
    if (!telemetryData?.key || !telemetryData?.deviceId) return;
    const { deviceId, key, value, ts } = telemetryData;

    // Zone'lar ve marker'lar için eşleşen telemetri key'i kontrol et
    const matchingZone = (config.zones || []).find(z => z.deviceId === deviceId && z.telemetryKey === key);
    const matchingMarker = manualMarkers.find(m => m.deviceId === deviceId && m.telemetryKey === key);

    if (matchingZone || matchingMarker) {
      setTelemetryValues(prev => ({
        ...prev,
        [deviceId]: { key, value, ts: ts || Date.now() },
      }));
    }
  }, [config.zones, manualMarkers]);

  useMultiTelemetrySSE(
    !isPublic ? assignedDeviceIds : [],
    handleAssignedSSEData
  );

  // ── İlk yüklemede atanmış cihazların telemetrisini çek ──
  useEffect(() => {
    const fetchAssignedTelemetry = async () => {
      for (const did of assignedDeviceIds) {
        try {
          const zone = (config.zones || []).find(z => z.deviceId === did);
          const marker = manualMarkers.find(m => m.deviceId === did);
          const telKey = zone?.telemetryKey || marker?.telemetryKey;
          if (!telKey) continue;

          const res = await fetch(`/api/telemetry?deviceId=${did}&latest=true`);
          const json = await res.json();
          if (json.ok && json.data) {
            const entry = json.data.find(d => d.key === telKey);
            if (entry) {
              setTelemetryValues(prev => ({
                ...prev,
                [did]: { key: telKey, value: entry.value, ts: entry.timestamp },
              }));
            }
          }
        } catch { /* silent */ }
      }
    };
    if (assignedDeviceIds.length > 0) fetchAssignedTelemetry();
  }, [assignedDeviceIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cihaz konumlarını telemetriden çek (paralel) ──
  const fetchLocations = useCallback(async () => {
    if (!devices || devices.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const baseUrl = publicToken
        ? `/api/public/telemetry/${publicToken}`
        : `/api/telemetry`;

      const results = await Promise.all(
        devices.map(async (device) => {
          const deviceId = device.id || device._id;
          if (!deviceId) return null;
          try {
            const res = await fetch(`${baseUrl}?deviceId=${deviceId}&latest=true`);
            const json = await res.json();

            if (json.ok && json.data) {
              const latEntry = json.data.find((d) => d.key === latitudeKey);
              const lngEntry = json.data.find((d) => d.key === longitudeKey);

              if (latEntry && lngEntry) {
                const lat = parseFloat(latEntry.value);
                const lng = parseFloat(lngEntry.value);

                if (!isNaN(lat) && !isNaN(lng)) {
                  const extraData = {};
                  json.data
                    .filter((d) => d.key !== latitudeKey && d.key !== longitudeKey)
                    .forEach((d) => { extraData[d.key] = d.value; });

                  return {
                    id: deviceId,
                    name: device.name || device.label || "Cihaz",
                    lat, lng, extraData,
                    lastUpdate: latEntry.timestamp,
                  };
                }
              }
            }
          } catch { /* tek cihaz hatası diğerlerini etkilemesin */ }
          return null;
        })
      );

      setMarkers(results.filter(Boolean));
    } catch (err) {
      console.error("Map fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [devices, publicToken, latitudeKey, longitudeKey]);

  useEffect(() => {
    fetchLocations();

    // Polling: 15 saniyede bir güncelle (tüm modlarda fallback)
    intervalRef.current = setInterval(fetchLocations, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchLocations]);

  // ── Authenticated modda SSE ile canlı konum güncellemesi ──
  const handleSSEData = useCallback(
    (telemetryData) => {
      if (!telemetryData?.key) return;
      const key = telemetryData.key;
      const sseDeviceId = telemetryData.deviceId;

      // Sadece konum key'leri ile ilgileniyoruz
      if (key !== latitudeKey && key !== longitudeKey) return;
      if (!sseDeviceId) return;

      setMarkers((prev) => {
        const idx = prev.findIndex((m) => m.id === sseDeviceId);
        if (idx === -1) {
          // Henüz marker yok — tek koordinat geldiğinde tam konum oluşturamayız,
          // bir sonraki polling'de oluşturulacak
          return prev;
        }

        const updated = [...prev];
        const marker = { ...updated[idx] };

        if (key === latitudeKey) {
          const lat = parseFloat(telemetryData.value);
          if (!isNaN(lat)) marker.lat = lat;
        }
        if (key === longitudeKey) {
          const lng = parseFloat(telemetryData.value);
          if (!isNaN(lng)) marker.lng = lng;
        }

        marker.lastUpdate = telemetryData.ts || Date.now();
        updated[idx] = marker;
        return updated;
      });
    },
    [latitudeKey, longitudeKey]
  );

  // SSE hook — sadece authenticated modda aktif, public modda boş array geçerek devre dışı
  useMultiTelemetrySSE(
    !isPublic ? deviceIds : [],
    handleSSEData
  );

  // ── Edit mode config ──
  const handleConfigChange = (newConfig) => {
    onConfigChange?.({ ...config, ...newConfig });
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
        deviceId: null,
        deviceName: "",
        telemetryKey: null,
      };
      handleConfigChange({
        zones: [...(config.zones || []), newZone],
      });
    },
    [config, handleConfigChange]
  );

  // ── Manuel marker oluşturma callback ──
  const handleMarkerCreated = useCallback(
    ({ lat, lng }) => {
      const newMarker = {
        id: "mm-" + Date.now(),
        lat,
        lng,
        name: `Marker ${(manualMarkers.length || 0) + 1}`,
        deviceId: null,
        deviceName: "",
        telemetryKey: null,
        color: "#ef4444",
      };
      handleConfigChange({
        manualMarkers: [...manualMarkers, newMarker],
      });
    },
    [config, manualMarkers, handleConfigChange]
  );

  // ── Zone güncelleme helper'ları ──
  const updateZone = (idx, updates) => {
    const updated = [...(config.zones || [])];
    updated[idx] = { ...updated[idx], ...updates };
    handleConfigChange({ zones: updated });
  };

  const deleteZone = (idx) => {
    const updated = [...(config.zones || [])];
    updated.splice(idx, 1);
    handleConfigChange({ zones: updated });
  };

  // ── Manuel marker güncelleme helper'ları ──
  const updateManualMarker = (id, updates) => {
    const updated = manualMarkers.map(m => m.id === id ? { ...m, ...updates } : m);
    handleConfigChange({ manualMarkers: updated });
  };

  const deleteManualMarker = (id) => {
    handleConfigChange({ manualMarkers: manualMarkers.filter(m => m.id !== id) });
  };

  // ── Floating toolbar butonları ──
  const handleAddZone = () => {
    leafletRef.current?.activateRectangle();
  };

  const handleAddMarker = () => {
    leafletRef.current?.activateMarker();
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

  if (devices.length === 0 && !isEditMode) {
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
        ref={leafletRef}
        markers={markers}
        manualMarkers={manualMarkers}
        center={defaultCenter}
        zoom={defaultZoom}
        showTooltips={showTooltips}
        fitBounds={fitBounds && (markers.length > 0 || manualMarkers.length > 0)}
        zones={allZones}
        tileLayer={tileLayer}
        isEditMode={isEditMode}
        onZoneCreated={isEditMode ? handleZoneCreated : undefined}
        onMarkerCreated={isEditMode ? handleMarkerCreated : undefined}
        telemetryValues={telemetryValues}
      />

      {/* Floating Toolbar — edit mode */}
      {isEditMode && (
        <div className="absolute top-2 left-12 z-[1000] flex gap-2">
          <button
            onClick={handleAddZone}
            className="bg-white shadow-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <Plus className="h-3.5 w-3.5" /> Bölge Ekle
          </button>
          <button
            onClick={handleAddMarker}
            className="bg-white shadow-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <MapPin className="h-3.5 w-3.5" /> Marker Ekle
          </button>
        </div>
      )}

      {/* Marker + Zone sayısı badge */}
      <div className="absolute top-2 right-2 z-[1000] bg-bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1 text-xs text-text-muted space-y-0.5">
        <div>📍 {markers.length} / {devices.length} cihaz</div>
        {manualMarkers.length > 0 && (
          <div>📌 {manualMarkers.length} marker</div>
        )}
        {allZones.length > 0 && (
          <div>📐 {allZones.length} bölge</div>
        )}
        {!isPublic && (
          <div className="text-green-500/70 text-[9px]">● SSE Canlı</div>
        )}
      </div>

      {/* Edit mode config panel */}
      {isEditMode && (
        <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 max-h-[45%] overflow-y-auto">
          {/* Enlem / Boylam Key ayarları */}
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

          {/* ── Bölgeler bölümü ── */}
          {(config.zones || []).length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-[10px] font-semibold text-text-muted mb-1">📐 Bölgeler</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {(config.zones || []).map((z, i) => (
                  <div key={`config-zone-${i}`} className="bg-bg-surface/50 rounded-md p-1.5 border border-border/30">
                    <div className="flex items-center justify-between gap-1">
                      {/* Renk seçici */}
                      <input
                        type="color"
                        value={z.color || "#22c55e"}
                        onChange={(e) => updateZone(i, { color: e.target.value, borderColor: e.target.value })}
                        className="h-5 w-5 rounded cursor-pointer border-0 p-0 flex-shrink-0"
                        title="Bölge rengi"
                      />

                      {/* İsim (düzenlenebilir) */}
                      {editingZoneId === i ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingZoneName}
                            onChange={(e) => setEditingZoneName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateZone(i, { name: editingZoneName });
                                setEditingZoneId(null);
                              }
                              if (e.key === "Escape") setEditingZoneId(null);
                            }}
                            className="flex-1 min-w-0 px-1.5 py-0.5 bg-white border border-border rounded text-[10px] text-text-main"
                            autoFocus
                          />
                          <button
                            onClick={() => { updateZone(i, { name: editingZoneName }); setEditingZoneId(null); }}
                            className="text-green-500 hover:text-green-700 p-0.5"
                          ><Check className="h-3 w-3" /></button>
                          <button
                            onClick={() => setEditingZoneId(null)}
                            className="text-gray-400 hover:text-gray-600 p-0.5"
                          ><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <span
                          className="flex-1 min-w-0 text-[10px] text-text-main truncate cursor-pointer hover:text-primary"
                          onDoubleClick={() => { setEditingZoneId(i); setEditingZoneName(z.name || `Bölge ${i + 1}`); }}
                          title="Çift tıkla düzenle"
                        >
                          {z.name || `Bölge ${i + 1}`}
                        </span>
                      )}

                      <button
                        onClick={() => { setEditingZoneId(i); setEditingZoneName(z.name || `Bölge ${i + 1}`); }}
                        className="text-gray-400 hover:text-primary p-0.5 flex-shrink-0"
                        title="İsmi düzenle"
                      ><Pencil className="h-3 w-3" /></button>

                      <button
                        onClick={() => deleteZone(i)}
                        className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"
                        title="Bölgeyi sil"
                      ><Trash2 className="h-3 w-3" /></button>
                    </div>

                    {/* Cihaz atama */}
                    <div className="flex items-center gap-1 mt-1">
                      <select
                        value={z.deviceId || ""}
                        onChange={(e) => {
                          const dev = devices.find(d => (d.id || d._id) === e.target.value);
                          updateZone(i, {
                            deviceId: e.target.value || null,
                            deviceName: dev ? (dev.name || dev.label || "") : "",
                          });
                        }}
                        className="flex-1 min-w-0 px-1 py-0.5 bg-white border border-border rounded text-[10px] text-text-main"
                      >
                        <option value="">Cihaz seç...</option>
                        {devices.map(d => (
                          <option key={d.id || d._id} value={d.id || d._id}>
                            {d.name || d.label || d.id || d._id}
                          </option>
                        ))}
                      </select>
                      {z.deviceId && (
                        <input
                          type="text"
                          value={z.telemetryKey || ""}
                          onChange={(e) => updateZone(i, { telemetryKey: e.target.value || null })}
                          placeholder="Telemetri key"
                          className="w-24 px-1 py-0.5 bg-white border border-border rounded text-[10px] text-text-main"
                        />
                      )}
                    </div>

                    {/* Atanmış cihazın son değeri */}
                    {z.deviceId && telemetryValues[z.deviceId] && (
                      <div className="text-[9px] text-green-600 mt-0.5">
                        ● {telemetryValues[z.deviceId].key}: {telemetryValues[z.deviceId].value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Asset zone'ları (sadece-okunur liste) */}
          {zones.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-[10px] font-semibold text-text-muted mb-1">🏢 Asset Bölgeleri</p>
              <div className="space-y-0.5 max-h-16 overflow-y-auto">
                {zones.map((z) => (
                  <div key={z.id} className="flex items-center gap-1.5 text-[10px]">
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-white/30 flex-shrink-0"
                      style={{ background: z.color }}
                    />
                    <span className="text-text-main truncate">{z.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Marker'lar bölümü ── */}
          {manualMarkers.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-[10px] font-semibold text-text-muted mb-1">📌 Marker&apos;lar</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {manualMarkers.map((mm) => (
                  <div key={mm.id} className="bg-bg-surface/50 rounded-md p-1.5 border border-border/30">
                    <div className="flex items-center justify-between gap-1">
                      {/* Renk */}
                      <input
                        type="color"
                        value={mm.color || "#ef4444"}
                        onChange={(e) => updateManualMarker(mm.id, { color: e.target.value })}
                        className="h-5 w-5 rounded cursor-pointer border-0 p-0 flex-shrink-0"
                        title="Marker rengi"
                      />

                      {/* İsim (düzenlenebilir) */}
                      {editingMarkerId === mm.id ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingMarkerName}
                            onChange={(e) => setEditingMarkerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateManualMarker(mm.id, { name: editingMarkerName });
                                setEditingMarkerId(null);
                              }
                              if (e.key === "Escape") setEditingMarkerId(null);
                            }}
                            className="flex-1 min-w-0 px-1.5 py-0.5 bg-white border border-border rounded text-[10px] text-text-main"
                            autoFocus
                          />
                          <button
                            onClick={() => { updateManualMarker(mm.id, { name: editingMarkerName }); setEditingMarkerId(null); }}
                            className="text-green-500 hover:text-green-700 p-0.5"
                          ><Check className="h-3 w-3" /></button>
                          <button
                            onClick={() => setEditingMarkerId(null)}
                            className="text-gray-400 hover:text-gray-600 p-0.5"
                          ><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <span
                          className="flex-1 min-w-0 text-[10px] text-text-main truncate cursor-pointer hover:text-primary"
                          onDoubleClick={() => { setEditingMarkerId(mm.id); setEditingMarkerName(mm.name || "Marker"); }}
                          title="Çift tıkla düzenle"
                        >
                          {mm.name || "Marker"}
                        </span>
                      )}

                      {/* Konum bilgisi */}
                      <span className="text-[9px] text-text-light flex-shrink-0">
                        {mm.lat.toFixed(3)}, {mm.lng.toFixed(3)}
                      </span>

                      <button
                        onClick={() => { setEditingMarkerId(mm.id); setEditingMarkerName(mm.name || "Marker"); }}
                        className="text-gray-400 hover:text-primary p-0.5 flex-shrink-0"
                        title="İsmi düzenle"
                      ><Pencil className="h-3 w-3" /></button>

                      <button
                        onClick={() => deleteManualMarker(mm.id)}
                        className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"
                        title="Marker'ı sil"
                      ><Trash2 className="h-3 w-3" /></button>
                    </div>

                    {/* Cihaz atama */}
                    <div className="flex items-center gap-1 mt-1">
                      <select
                        value={mm.deviceId || ""}
                        onChange={(e) => {
                          const dev = devices.find(d => (d.id || d._id) === e.target.value);
                          updateManualMarker(mm.id, {
                            deviceId: e.target.value || null,
                            deviceName: dev ? (dev.name || dev.label || "") : "",
                          });
                        }}
                        className="flex-1 min-w-0 px-1 py-0.5 bg-white border border-border rounded text-[10px] text-text-main"
                      >
                        <option value="">Cihaz seç...</option>
                        {devices.map(d => (
                          <option key={d.id || d._id} value={d.id || d._id}>
                            {d.name || d.label || d.id || d._id}
                          </option>
                        ))}
                      </select>
                      {mm.deviceId && (
                        <input
                          type="text"
                          value={mm.telemetryKey || ""}
                          onChange={(e) => updateManualMarker(mm.id, { telemetryKey: e.target.value || null })}
                          placeholder="Telemetri key"
                          className="w-24 px-1 py-0.5 bg-white border border-border rounded text-[10px] text-text-main"
                        />
                      )}
                    </div>

                    {/* Atanmış cihazın son değeri */}
                    {mm.deviceId && telemetryValues[mm.deviceId] && (
                      <div className="text-[9px] text-green-600 mt-0.5">
                        ● {telemetryValues[mm.deviceId].key}: {telemetryValues[mm.deviceId].value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEditMode && (
            <p className="text-[9px] text-text-light mt-1.5 italic">
              💡 Araç çubuğu butonlarını veya sağ üstteki çizim araçlarını kullanın
            </p>
          )}
        </div>
      )}
    </div>
  );
}
