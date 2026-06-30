"use client";

/**
 * LeafletMap — Leaflet harita container bileşeni
 *
 * Bu dosya SADECE client-side'da çalışır (dynamic import ile ssr: false).
 * Leaflet CSS'i burada import edilir.
 * Zone/Polygon desteği: Geoman eklentisi kullanılarak çizim.
 * Marker desteği: MarkerClusterGroup ve leaflet.marker.slideto ile.
 */

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";
import "leaflet.marker.slideto";

// ── Harita katmanı (tile) yapılandırmaları ──
const TILE_CONFIGS = {
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
};

// ── Özel divIcon oluşturucular (ThingsBoard Stili) ──
function createDeviceIcon(name, telVal) {
  const html = `
    <div class="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-lg rounded-full px-2 py-1 transform -translate-x-1/2 -translate-y-full hover:scale-105 transition-transform cursor-pointer hover:shadow-xl hover:bg-white z-50 relative">
      <div class="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-inner flex-shrink-0 border border-indigo-600/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" class="w-3 h-3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
      </div>
      <div class="flex flex-col pr-1">
        <span class="text-[10px] font-bold text-gray-800 leading-tight whitespace-nowrap">${name}</span>
        ${telVal ? `<span class="text-[9px] text-gray-500 font-mono leading-tight whitespace-nowrap">${telVal.key}: <strong class="text-indigo-600">${telVal.value}</strong></span>` : ''}
      </div>
    </div>
  `;
  return new L.divIcon({
    html,
    className: 'bg-transparent border-0',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -32],
  });
}

function createColoredIcon(name, color = "#ef4444", telVal) {
  const html = `
    <div class="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-md rounded-full px-2 py-1 transform -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-105 transition-transform hover:shadow-lg relative z-40">
      <div class="w-4 h-4 rounded-full flex items-center justify-center shadow-inner flex-shrink-0" style="background-color: ${color}">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" class="w-2.5 h-2.5"><circle cx="12" cy="12" r="10"></circle></svg>
      </div>
      <div class="flex flex-col pr-1">
        <span class="text-[9px] font-bold text-gray-700 leading-tight whitespace-nowrap">${name || ''}</span>
        ${telVal ? `<span class="text-[8px] text-gray-500 font-mono leading-tight whitespace-nowrap">${telVal.key}: <strong>${telVal.value}</strong></span>` : ''}
      </div>
    </div>
  `;
  return new L.divIcon({
    html,
    className: 'bg-transparent border-0',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -28],
  });
}

// ── FitBounds helper ──
function FitBoundsHelper({ markers }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) return;

    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 15);
    } else {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers, map]);

  return null;
}

// ── Resize & Intersection Observer Helper ──
function ResizeObserverHelper() {
  const map = useMap();
  
  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    // IntersectionObserver for detecting when map becomes visible
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          map.invalidateSize();
        }
      });
    });
    
    // ResizeObserver for tracking dimension changes safely
    let rafId;
    let timeoutId;
    const ro = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      // Debounce the invalidateSize to prevent "Loop limit exceeded"
      timeoutId = setTimeout(() => {
        rafId = requestAnimationFrame(() => {
          map.invalidateSize();
        });
      }, 50);
    });

    io.observe(container);
    ro.observe(container);
    
    // Fallback safe trigger
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      io.disconnect();
      ro.disconnect();
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [map]);

  return null;
}

// ── Geoman Control (Çizim Araçları) ──
const GeomanControl = forwardRef(function GeomanControl({ onCreated, onMarkerCreated }, ref) {
  const map = useMap();

  useImperativeHandle(ref, () => ({
    activateRectangle: () => map.pm.enableDraw('Rectangle'),
    activateMarker: () => map.pm.enableDraw('Marker'),
    activatePolygon: () => map.pm.enableDraw('Polygon'),
  }));

  useEffect(() => {
    // Geoman ayarları
    map.pm.addControls({
      position: 'topright',
      drawPolygon: true,
      drawRectangle: true,
      drawMarker: true,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    map.pm.setGlobalOptions({
      pathOptions: {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        weight: 2,
      },
    });

    const handleCreate = (e) => {
      const { shape, layer } = e;
      if (shape === 'Marker') {
        const latlng = layer.getLatLng();
        onMarkerCreated?.({ lat: latlng.lat, lng: latlng.lng });
      } else if (shape === 'Polygon' || shape === 'Rectangle') {
        const latLngs = layer.getLatLngs()[0] || layer.getLatLngs();
        const coords = latLngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
        onCreated?.(coords);
      }
      // Çizilen şekli haritadan sil, çünkü React state'i güncellenince <Polygon> olarak geri eklenecek
      map.removeLayer(layer);
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
      map.pm.removeControls();
    };
  }, [map, onCreated, onMarkerCreated]);

  return null;
});

// ── Pürüzsüz (Smooth) Marker ──
const AnimatedMarker = ({ position, icon, children }) => {
  const [initialPos] = useState(position);
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current && markerRef.current.slideTo) {
      markerRef.current.slideTo(position, { duration: 500, keepAtCenter: false });
    }
  }, [position[0], position[1]]);

  return (
    <Marker ref={markerRef} position={initialPos} icon={icon}>
      {children}
    </Marker>
  );
};

const LeafletMap = forwardRef(function LeafletMap({
  markers = [],
  manualMarkers = [],
  center = { lat: 41.0082, lng: 28.9784 },
  zoom = 10,
  showTooltips = true, // We will use popups as requested by user instead of permanent tooltips for devices
  fitBounds = true,
  tileLayer = "osm",
  // Zone desteği
  zones = [],
  isEditMode = false,
  onZoneCreated,
  onMarkerCreated,
  // Zone/marker telemetri verileri
  telemetryValues = {},
}, ref) {
  const tile = TILE_CONFIGS[tileLayer] || TILE_CONFIGS.osm;
  const geomanControlRef = useRef(null);
  const [hoveredZoneId, setHoveredZoneId] = useState(null);

  // Tüm marker'ları (cihaz + manuel) birleştirip fitBounds'a ver
  const allFitMarkers = [
    ...markers,
    ...manualMarkers.map(m => ({ lat: m.lat, lng: m.lng })),
  ];

  // DrawControl ref'ini dışarıya expose et
  useImperativeHandle(ref, () => ({
    activateRectangle: () => geomanControlRef.current?.activateRectangle(),
    activateMarker: () => geomanControlRef.current?.activateMarker(),
    activatePolygon: () => geomanControlRef.current?.activatePolygon(),
  }));

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
      zoomControl={true}
      scrollWheelZoom={true}
      fadeAnimation={false} // Cluster'lar ile düzgün çalışması için
    >
      <ResizeObserverHelper />
      
      <TileLayer
        attribution={TILE_CONFIGS[tileLayer]?.attribution || TILE_CONFIGS.osm.attribution}
        url={TILE_CONFIGS[tileLayer]?.url || TILE_CONFIGS.osm.url}
      />

      {fitBounds && <FitBoundsHelper markers={allFitMarkers} />}

      {/* Edit modunda çizim aracı */}
      {isEditMode && (onZoneCreated || onMarkerCreated) && (
        <GeomanControl
          ref={geomanControlRef}
          onCreated={onZoneCreated}
          onMarkerCreated={onMarkerCreated}
        />
      )}

      {/* Zone/Polygon'ları render et */}
      {zones.map((zone, i) => {
        const zoneId = zone.id || `zone-${i}`;
        const isHovered = hoveredZoneId === zoneId;
        const zoneColor = zone.color || "#22c55e";
        const deviceId = zone.deviceId;
        const telVal = deviceId && telemetryValues[deviceId];
        const deviceName = zone.deviceName || "";

        return (
          <Polygon
            key={zoneId}
            positions={zone.coordinates.map(c => Array.isArray(c) ? c : [c.lat, c.lng])}
            pathOptions={{
              color: zone.borderColor || zoneColor,
              fillColor: zoneColor,
              fillOpacity: isHovered ? Math.min((zone.opacity || 0.25) + 0.2, 0.7) : (zone.opacity || 0.25),
              weight: isHovered ? (zone.borderWidth || 2) + 1 : (zone.borderWidth || 2),
            }}
            eventHandlers={{
              mouseover: () => setHoveredZoneId(zoneId),
              mouseout: () => setHoveredZoneId(null),
            }}
          >
            {/* Zone tooltip (isim) - Bölgeler için tooltip kalabilir veya popup olabilir */}
            {zone.name && (
              <LeafletTooltip sticky direction="center" className="zone-label">
                <span style={{ fontSize: "11px", fontWeight: 600 }}>{zone.name}</span>
                {telVal && (
                  <span style={{ fontSize: "10px", display: "block", color: "#6b7280" }}>
                    {telVal.value}
                  </span>
                )}
              </LeafletTooltip>
            )}

            {/* Zone popup (tıklandığında) */}
            <Popup>
              <div className="text-sm min-w-[180px]">
                <div className="font-semibold text-gray-900 mb-1">{zone.name || "İsimsiz Bölge"}</div>
                <div className="text-xs text-gray-500 mb-1">
                  Tip: {zone.type || (zoneId.startsWith?.("config-") ? "Widget" : "Asset")}
                </div>
                {deviceName && (
                  <div className="text-xs text-gray-600 mb-1">
                    📱 Cihaz: <span className="font-medium">{deviceName}</span>
                  </div>
                )}
                {telVal && (
                  <div className="border-t border-gray-200 pt-1 mt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{telVal.key || "Değer"}:</span>
                      <span className="font-mono text-gray-900 font-semibold">{telVal.value}</span>
                    </div>
                    {telVal.ts && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(telVal.ts).toLocaleString("tr-TR")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Polygon>
        );
      })}

      <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
        {/* Cihaz telemetri marker'ları */}
        {markers.map((marker) => {
          const telVal = Object.keys(marker.extraData || {}).length > 0 
            ? { key: Object.keys(marker.extraData)[0], value: Object.values(marker.extraData)[0] } 
            : null;

          return (
            <AnimatedMarker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={createDeviceIcon(marker.name, telVal)}
            >
              {showTooltips && (
                <Popup>
                  <div className="text-sm min-w-[160px]" aria-label={`Cihaz bilgisi: ${marker.name}`}>
                    <div className="font-semibold text-gray-900 mb-1">
                      {marker.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      📍 {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                    </div>

                    {/* Ek telemetri verileri */}
                    {Object.keys(marker.extraData || {}).length > 0 && (
                      <div className="border-t border-gray-200 pt-1 mt-1 space-y-0.5">
                        {Object.entries(marker.extraData).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-gray-500">{key}:</span>
                            <span className="font-mono text-gray-900">
                              {typeof value === "number"
                                ? value.toFixed(2)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {marker.lastUpdate && (
                      <div className="text-[10px] text-gray-400 mt-1 border-t border-gray-100 pt-1">
                        Son güncelleme:{" "}
                        {new Date(marker.lastUpdate).toLocaleString("tr-TR")}
                      </div>
                    )}
                  </div>
                </Popup>
              )}
            </AnimatedMarker>
          );
        })}

        {/* Manuel marker'lar */}
        {manualMarkers.map((mm) => {
          const telVal = mm.deviceId && telemetryValues[mm.deviceId];
          return (
            <AnimatedMarker
              key={mm.id}
              position={[mm.lat, mm.lng]}
              icon={createColoredIcon(mm.name || "Marker", mm.color || "#ef4444", telVal)}
            >
              {showTooltips && (
                <Popup>
                  <div className="text-sm min-w-[160px]" aria-label={`Marker bilgisi: ${mm.name}`}>
                    <div className="font-semibold text-gray-900 mb-1">
                      📌 {mm.name || "Manuel Marker"}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      📍 {mm.lat.toFixed(5)}, {mm.lng.toFixed(5)}
                    </div>
                    {mm.deviceName && (
                      <div className="text-xs text-gray-600 mb-1">
                        📱 Cihaz: <span className="font-medium">{mm.deviceName}</span>
                      </div>
                    )}
                    {telVal && (
                      <div className="border-t border-gray-200 pt-1 mt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{telVal.key || "Değer"}:</span>
                          <span className="font-mono text-gray-900 font-semibold">{telVal.value}</span>
                        </div>
                        {telVal.ts && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(telVal.ts).toLocaleString("tr-TR")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              )}
            </AnimatedMarker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
});

export default LeafletMap;
