"use client";

/**
 * MarkerConfigPanel — Yeni marker ekleme paneli
 *
 * Cihaz seçimi, telemetri key girişi, ikon tipi seçimi,
 * per-marker renk ve boyut özelleştirmesi.
 * Tıkla-yerleştir modunda initialXPos/initialYPos ile konum alır.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Zap,
  Wifi,
  Camera,
  AlertTriangle,
  Activity,
  Sun,
  Fan,
  Plus,
  XCircle,
} from "lucide-react";

/* ── Seçilebilir ikon tipleri (genişletilmiş Lucide set) ── */
const ICON_OPTIONS = [
  { value: "pin", label: "Pin", icon: MapPin },
  { value: "thermometer", label: "Sıcaklık", icon: Thermometer },
  { value: "droplets", label: "Nem", icon: Droplets },
  { value: "wind", label: "Rüzgâr", icon: Wind },
  { value: "gauge", label: "Gösterge", icon: Gauge },
  { value: "zap", label: "Enerji", icon: Zap },
  { value: "wifi", label: "Wi-Fi", icon: Wifi },
  { value: "camera", label: "Kamera", icon: Camera },
  { value: "alert", label: "Uyarı", icon: AlertTriangle },
  { value: "activity", label: "Aktivite", icon: Activity },
  { value: "sun", label: "Güneş", icon: Sun },
  { value: "fan", label: "Fan", icon: Fan },
];

export default function MarkerConfigPanel({
  devices: propDevices = [],
  onAdd,
  onClose,
  initialXPos = 50,
  initialYPos = 50,
}) {
  const [deviceList, setDeviceList] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [telemetryKey, setTelemetryKey] = useState("");
  const [iconType, setIconType] = useState("pin");
  const [markerColor, setMarkerColor] = useState("");
  const [markerSizeLocal, setMarkerSizeLocal] = useState("");
  const [availableKeys, setAvailableKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Parent'tan cihaz gelmediyse API'den çek
  useEffect(() => {
    if (propDevices.length > 0) {
      setDeviceList(propDevices.map(d => ({ id: d.id || d._id, name: d.name })));
      setDeviceId(propDevices[0]?.id || propDevices[0]?._id || "");
      return;
    }
    setLoadingDevices(true);
    fetch("/api/device?limit=100")
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.data) {
          const list = data.data.map(d => ({ id: d._id, name: d.name }));
          setDeviceList(list);
          if (list.length > 0) setDeviceId(list[0].id);
        }
      })
      .catch(() => setDeviceList([]))
      .finally(() => setLoadingDevices(false));
  }, [propDevices]);

  const selectedDevice = deviceList.find((d) => d.id === deviceId);

  // Cihaz seçildiğinde telemetri key'lerini çek
  useEffect(() => {
    if (!deviceId) { setAvailableKeys([]); return; }
    setLoadingKeys(true);
    setTelemetryKey(""); // Cihaz değiştiğinde key sıfırla
    fetch(`/api/telemetry/keys?deviceId=${deviceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setAvailableKeys(data.keys || []);
        else setAvailableKeys([]);
      })
      .catch(() => setAvailableKeys([]))
      .finally(() => setLoadingKeys(false));
  }, [deviceId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!deviceId || !telemetryKey.trim()) return;

    onAdd?.({
      id: crypto.randomUUID(),
      deviceId,
      deviceName: selectedDevice?.name || "Cihaz",
      telemetryKey: telemetryKey.trim(),
      xPos: initialXPos,
      yPos: initialYPos,
      iconType,
      color: markerColor || null,
      size: markerSizeLocal ? Number(markerSizeLocal) : null,
    });
  };

  /* ── Shared input sınıfları ── */
  const inputCls =
    "w-full rounded-lg border border-gray-200 bg-white/70 px-3 py-2 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-halo-400/40 transition-shadow";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg p-4 border border-gray-200 w-80"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* ── Başlık ── */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-main">Marker Ekle</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {/* ── Cihaz seçimi ── */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Cihaz
          </label>
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className={inputCls}
            disabled={loadingDevices}
          >
            {loadingDevices ? (
              <option value="">Cihazlar yükleniyor...</option>
            ) : deviceList.length === 0 ? (
              <option value="">Cihaz bulunamadı</option>
            ) : null}
            {deviceList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Telemetri key (autocomplete dropdown) ── */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Telemetri Anahtarı
          </label>
          {loadingKeys ? (
            <div className={`${inputCls} flex items-center gap-2 text-text-muted/60`}>
              <div className="w-3 h-3 border-2 border-gray-300 border-t-halo-500 rounded-full animate-spin" />
              Yükleniyor...
            </div>
          ) : availableKeys.length > 0 ? (
            <select
              value={telemetryKey}
              onChange={(e) => setTelemetryKey(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Veri seçin...</option>
              {availableKeys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={telemetryKey}
              onChange={(e) => setTelemetryKey(e.target.value)}
              placeholder="ör. temperature"
              className={inputCls}
              required
            />
          )}
        </div>

        {/* ── İkon tipi ── */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            İkon Tipi
          </label>
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_OPTIONS.map(({ value, label, icon: Ico }) => (
              <button
                key={value}
                type="button"
                onClick={() => setIconType(value)}
                title={label}
                className={`
                  flex items-center justify-center h-8 w-8 rounded-lg border transition-all
                  ${
                    iconType === value
                      ? "border-halo-400 bg-halo-50 text-halo-600 shadow-sm"
                      : "border-gray-200 bg-white/60 text-gray-400 hover:border-gray-300"
                  }
                `}
              >
                <Ico className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Per-marker renk seçimi ── */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Marker Renk <span className="text-text-muted/50">(opsiyonel)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={markerColor || "#6366f1"}
              onChange={(e) => setMarkerColor(e.target.value)}
              className="h-8 w-10 rounded border border-gray-200 cursor-pointer bg-white/70 p-0.5"
            />
            <input
              type="text"
              value={markerColor}
              onChange={(e) => setMarkerColor(e.target.value)}
              placeholder="Varsayılan"
              className={`${inputCls} flex-1`}
            />
            {markerColor && (
              <button
                type="button"
                onClick={() => setMarkerColor("")}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title="Sıfırla"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Per-marker boyut seçimi ── */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Marker Boyut <span className="text-text-muted/50">(opsiyonel, 12-48)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={12}
              max={48}
              step={4}
              value={markerSizeLocal}
              onChange={(e) => setMarkerSizeLocal(e.target.value)}
              placeholder="Varsayılan"
              className={inputCls}
            />
            {markerSizeLocal && (
              <button
                type="button"
                onClick={() => setMarkerSizeLocal("")}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title="Sıfırla"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Aksiyon butonları ── */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={!deviceId || !telemetryKey.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-halo-600 text-white text-sm font-medium py-2 hover:bg-halo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ekle
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 bg-white/60 text-sm font-medium text-text-muted py-2 hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
        </div>
      </form>
    </motion.div>
  );
}
