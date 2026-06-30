"use client";

/**
 * RpcSliderWidget — RPC Kaydırıcı Kontrolü
 * Cihaza sayısal değer gönderir (0-100 arası).
 * Config: { method: "setSpeed", paramKey: "value", min: 0, max: 100, step: 1, unit: "%" }
 */

import { useState, useCallback, useRef } from "react";
import { SlidersHorizontal, Send, Loader2 } from "lucide-react";
import { getUnitSymbol } from "@/lib/units";
import toast from "react-hot-toast";

export default function RpcSliderWidget({
  devices = [], keys = [], title = "Kaydırıcı",
  config = {}, isEditMode = false, widgetId, onConfigChange,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const deviceName = device?.name || "Bilinmeyen";

  const method = config.method || "setValue";
  const paramKey = config.paramKey || "value";
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const step = config.step ?? 1;
  const unitSymbol = getUnitSymbol(config.unit) || "%";
  const confirmAction = config.confirmAction || false;
  const timeout = config.timeout || 10000;
  const sliderColor = config.sliderColor || "#6366f1";

  // Ekstra sabit parametreler (ör: {"pin": 4})
  let extraParams = {};
  try {
    if (config.extraParams) {
      extraParams = typeof config.extraParams === "string"
        ? JSON.parse(config.extraParams)
        : config.extraParams;
    }
  } catch { /* geçersiz JSON yoksay */ }

  const [value, setValue] = useState(min);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const debounceRef = useRef(null);

  const sendRpc = useCallback(async (val) => {
    if (!deviceId || isEditMode) return;

    if (confirmAction) {
      const ok = window.confirm(`${deviceName}: ${val}${unitSymbol} değerini göndermek istediğinize emin misiniz?`);
      if (!ok) return;
    }

    try {
      setLoading(true);
      setSent(false);
      const res = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          method,
          params: { ...extraParams, [paramKey]: val },
          timeout,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSent(true);
        toast.success(`${deviceName}: ${val}${unitSymbol}`);
        setTimeout(() => setSent(false), 2000);
      } else {
        toast.error(data.message || "RPC hatası");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }, [deviceId, method, paramKey, unitSymbol, deviceName, isEditMode, confirmAction, timeout]);

  const handleChange = (e) => {
    const v = Number(e.target.value);
    setValue(v);
  };

  const handleSend = () => {
    sendRpc(value);
  };

  // Calculate fill percentage for the track gradient
  const fillPercent = ((value - min) / (max - min)) * 100;

  if (!deviceId) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <p className="text-sm">Cihaz seçilmedi</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-4">
      {/* Value display */}
      <div className="text-center">
        <p className="text-4xl font-bold text-text-main">
          {value}
          <span className="text-lg text-text-muted ml-1">{unitSymbol}</span>
        </p>
        <p className="text-xs text-text-muted mt-1">{deviceName}</p>
      </div>

      {/* Slider */}
      <div className="w-full max-w-[280px]">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={isEditMode}
          className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${fillPercent}%, #e5e7eb ${fillPercent}%, #e5e7eb 100%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-text-light mt-1">
          <span>{min}{unitSymbol}</span>
          <span>{max}{unitSymbol}</span>
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={loading || isEditMode}
        className={`
          flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all
          ${sent
            ? "bg-green-500 text-white"
            : "bg-gradient-to-r from-halo-600 to-halo-700 text-white hover:from-halo-700 hover:to-halo-800"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-md hover:shadow-lg active:scale-95
        `}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : sent ? (
          <>✓ Gönderildi</>
        ) : (
          <><Send className="h-4 w-4" /> Gönder</>
        )}
      </button>
    </div>
  );
}
