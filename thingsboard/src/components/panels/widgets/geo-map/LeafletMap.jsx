"use client";

/**
 * LeafletMap — Leaflet harita container bileşeni
 *
 * Bu dosya SADECE client-side'da çalışır (dynamic import ile ssr: false).
 * Leaflet CSS'i burada import edilir.
 * Zone/Polygon desteği: Edit modunda çizim, okuma modunda render.
 * Marker desteği: Edit modunda tek nokta marker ekleme.
 */

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

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

// ── Özel marker ikonu (cihaz telemetri marker'ları) ──
const deviceIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ── Renkli marker ikonu oluşturucu (manuel marker'lar için) ──
function createColoredIcon(color = "#ef4444") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="#fff"/>
  </svg>`;
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -36],
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

// ── DrawControl — Edit modunda polygon + marker çizim aracı ──
const DrawControl = forwardRef(function DrawControl({ onCreated, onMarkerCreated }, ref) {
  const map = useMap();
  const controlRef = useRef(null);
  const drawnRef = useRef(null);

  // DrawControl ref'ini dışarıya expose et (programatik aktivasyon için)
  useImperativeHandle(ref, () => ({
    activateRectangle: () => {
      if (controlRef.current) {
        new L.Draw.Rectangle(map, controlRef.current.options.draw.rectangle).enable();
      }
    },
    activateMarker: () => {
      if (controlRef.current) {
        new L.Draw.Marker(map, controlRef.current.options.draw.marker).enable();
      }
    },
    activatePolygon: () => {
      if (controlRef.current) {
        new L.Draw.Polygon(map, controlRef.current.options.draw.polygon).enable();
      }
    },
  }));

  useEffect(() => {
    if (controlRef.current) return; // zaten eklendi

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: "#6941c6",
            fillColor: "#6941c6",
            fillOpacity: 0.25,
            weight: 2,
          },
        },
        rectangle: {
          shapeOptions: {
            color: "#22c55e",
            fillColor: "#22c55e",
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        polyline: false,
        circle: false,
        marker: {
          icon: createColoredIcon("#6366f1"),
        },
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });

    map.addControl(drawControl);
    controlRef.current = drawControl;

    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);

      if (e.layerType === "marker") {
        // Marker oluşturuldu
        const latlng = layer.getLatLng();
        onMarkerCreated?.({ lat: latlng.lat, lng: latlng.lng });
      } else {
        // Polygon veya rectangle oluşturuldu
        const latLngs = layer.getLatLngs()[0] || layer.getLatLngs();
        const coords = latLngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
        onCreated?.(coords);
      }
    });

    return () => {
      map.off(L.Draw.Event.CREATED);
      if (controlRef.current) {
        map.removeControl(controlRef.current);
        controlRef.current = null;
      }
      if (drawnRef.current) {
        map.removeLayer(drawnRef.current);
        drawnRef.current = null;
      }
    };
  }, [map, onCreated, onMarkerCreated]);

  return null;
});

const LeafletMap = forwardRef(function LeafletMap({
  markers = [],
  manualMarkers = [],
  center = { lat: 41.0082, lng: 28.9784 },
  zoom = 10,
  showTooltips = true,
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
  const drawControlRef = useRef(null);
  const [hoveredZoneId, setHoveredZoneId] = useState(null);

  // Tüm marker'ları (cihaz + manuel) birleştirip fitBounds'a ver
  const allFitMarkers = [
    ...markers,
    ...manualMarkers.map(m => ({ lat: m.lat, lng: m.lng })),
  ];

  // DrawControl ref'ini dışarıya expose et
  useImperativeHandle(ref, () => ({
    activateRectangle: () => drawControlRef.current?.activateRectangle(),
    activateMarker: () => drawControlRef.current?.activateMarker(),
    activatePolygon: () => drawControlRef.current?.activatePolygon(),
  }));

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution={TILE_CONFIGS[tileLayer]?.attribution || TILE_CONFIGS.osm.attribution}
        url={TILE_CONFIGS[tileLayer]?.url || TILE_CONFIGS.osm.url}
      />

      {fitBounds && <FitBoundsHelper markers={allFitMarkers} />}

      {/* Edit modunda çizim aracı */}
      {isEditMode && (onZoneCreated || onMarkerCreated) && (
        <DrawControl
          ref={drawControlRef}
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
            {/* Zone tooltip (isim) */}
            {showTooltips && zone.name && (
              <LeafletTooltip permanent direction="center" className="zone-label">
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

      {/* Cihaz telemetri marker'ları */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={deviceIcon}
        >
          {showTooltips && (
            <Popup>
              <div className="text-sm min-w-[160px]">
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
        </Marker>
      ))}

      {/* Manuel marker'lar */}
      {manualMarkers.map((mm) => {
        const telVal = mm.deviceId && telemetryValues[mm.deviceId];
        return (
          <Marker
            key={mm.id}
            position={[mm.lat, mm.lng]}
            icon={createColoredIcon(mm.color || "#ef4444")}
          >
            {showTooltips && (
              <Popup>
                <div className="text-sm min-w-[160px]">
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
          </Marker>
        );
      })}
    </MapContainer>
  );
});

export default LeafletMap;
