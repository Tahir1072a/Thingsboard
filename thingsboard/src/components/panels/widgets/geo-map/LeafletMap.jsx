"use client";

/**
 * LeafletMap — Leaflet harita container bileşeni
 *
 * Bu dosya SADECE client-side'da çalışır (dynamic import ile ssr: false).
 * Leaflet CSS'i burada import edilir.
 * Zone/Polygon desteği: Edit modunda çizim, okuma modunda render.
 */

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// ── Özel marker ikonu ──
const deviceIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

// ── DrawControl — Edit modunda polygon çizim aracı ──
function DrawControl({ onCreated }) {
  const map = useMap();
  const controlRef = useRef(null);
  const drawnRef = useRef(null);

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
        marker: false,
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
      const latLngs = layer.getLatLngs()[0] || layer.getLatLngs();
      const coords = latLngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
      onCreated?.(coords);
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
  }, [map, onCreated]);

  return null;
}

export default function LeafletMap({
  markers = [],
  center = { lat: 41.0082, lng: 28.9784 },
  zoom = 10,
  showTooltips = true,
  fitBounds = true,
  // Zone desteği
  zones = [],
  isEditMode = false,
  onZoneCreated,
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {fitBounds && <FitBoundsHelper markers={markers} />}

      {/* Edit modunda çizim aracı */}
      {isEditMode && onZoneCreated && (
        <DrawControl onCreated={onZoneCreated} />
      )}

      {/* Zone/Polygon'ları render et */}
      {zones.map((zone, i) => (
        <Polygon
          key={zone.id || `zone-${i}`}
          positions={zone.coordinates.map(c => Array.isArray(c) ? c : [c.lat, c.lng])}
          pathOptions={{
            color: zone.borderColor || zone.color || "#6941c6",
            fillColor: zone.color || "#6941c6",
            fillOpacity: zone.opacity || 0.25,
            weight: zone.borderWidth || 2,
          }}
        >
          {showTooltips && zone.name && (
            <LeafletTooltip permanent direction="center" className="zone-label">
              <span style={{ fontSize: "11px", fontWeight: 600 }}>{zone.name}</span>
            </LeafletTooltip>
          )}
        </Polygon>
      ))}

      {/* Cihaz marker'ları */}
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
    </MapContainer>
  );
}
