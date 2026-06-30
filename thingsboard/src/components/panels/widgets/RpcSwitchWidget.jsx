"use client";

/**
 * RpcSwitchWidget — RPC Anahtar Kontrolü
 * Cihaza açma/kapama komutu gönderir.
 * Config: { method: "setValue", paramKey: "value", onValue: true, offValue: false }
 */

import { useState, useCallback, useEffect } from "react";
import { Power, Loader2 } from "lucide-react";
import { useTelemetrySSE } from "@/lib/sse-pool";
import toast from "react-hot-toast";

export default function RpcSwitchWidget({
  devices = [], keys = [], title = "Anahtar",
  config = {}, isEditMode = false, widgetId, onConfigChange,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const deviceName = device?.name || "Bilinmeyen";

  const method = config.method || "setValue";
  const paramKey = config.paramKey || "value";
  const onValue = config.onValue !== undefined ? config.onValue : true;
  const offValue = config.offValue !== undefined ? config.offValue : false;
  const confirmAction = config.confirmAction || false;
  const timeout = config.timeout || 10000;
  const activeColor = config.activeColor || "#22c55e";

  // Ekstra sabit parametreler (ör: {"pin": 2})
  let extraParams = {};
  try {
    if (config.extraParams) {
      extraParams = typeof config.extraParams === "string"
        ? JSON.parse(config.extraParams)
        : config.extraParams;
    }
  } catch { /* geçersiz JSON yoksay */ }

  const [isOn, setIsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Telemetri key'i — widget'a key atanmışsa onu kullan, yoksa method adından türet
  const stateKey = keys[0] || config.stateKey || null;

  // Açılışta son telemetri değerini çek (durum geri yükleme)
  useEffect(() => {
    if (!deviceId || !stateKey || initialized) return;
    fetch(`/api/telemetry?deviceId=${deviceId}&key=${stateKey}&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.data?.length > 0) {
          const lastVal = data.data[0].value;
          setIsOn(lastVal === onValue || lastVal === true || lastVal === 1 || lastVal === "true");
        }
        setInitialized(true);
      })
      .catch(() => setInitialized(true));
  }, [deviceId, stateKey, initialized, onValue]);

  // SSE ile canlı telemetri dinle — cihaz durum gönderdiğinde widget güncellenir
  useTelemetrySSE(deviceId, useCallback((telemetryData) => {
    if (stateKey && telemetryData.key === stateKey) {
      const v = telemetryData.value;
      setIsOn(v === onValue || v === true || v === 1 || v === "true");
    }
  }, [stateKey, onValue]));

  const handleToggle = useCallback(async () => {
    if (!deviceId || isEditMode) return;
    const newState = !isOn;

    // Onay diyaloğu
    if (confirmAction) {
      const ok = window.confirm(`${deviceName} cihazını ${newState ? "AÇMAK" : "KAPATMAK"} istediğinize emin misiniz?`);
      if (!ok) return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          method,
          params: { ...extraParams, [paramKey]: newState ? onValue : offValue },
          timeout,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsOn(newState);
        setLastResponse(data.data?.status || "PENDING");
        toast.success(`${deviceName}: ${newState ? "AÇIK" : "KAPALI"}`);
      } else {
        toast.error(data.message || "RPC hatası");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }, [deviceId, isOn, method, paramKey, onValue, offValue, deviceName, isEditMode, confirmAction, timeout]);

  if (!deviceId) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <p className="text-sm">Cihaz seçilmedi</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      {/* Switch Button */}
      <button
        onClick={handleToggle}
        disabled={loading || isEditMode}
        className={`
          relative w-24 h-24 rounded-full transition-all duration-500 ease-out
          flex items-center justify-center
          ${loading ? "opacity-70 cursor-wait" : isEditMode ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          ${!isOn ? "bg-gradient-to-br from-gray-300 to-gray-500 shadow-md shadow-gray-400/20" : "shadow-lg"}
          hover:scale-105 active:scale-95
        `}
        style={isOn ? { background: activeColor, boxShadow: `0 10px 15px -3px ${activeColor}40` } : undefined}
      >
        {loading ? (
          <Loader2 className="h-10 w-10 text-white animate-spin" />
        ) : (
          <Power className={`h-10 w-10 text-white transition-transform ${isOn ? "scale-110" : ""}`} />
        )}

        {/* Glow ring */}
        {isOn && (
          <div className="absolute inset-0 rounded-full animate-pulse bg-green-400/20" />
        )}
      </button>

      {/* Status */}
      <div className="text-center">
        <p className={`text-lg font-bold ${isOn ? "text-green-600" : "text-gray-500"}`}>
          {isOn ? "AÇIK" : "KAPALI"}
        </p>
        <p className="text-xs text-text-muted mt-1">{deviceName}</p>
        {lastResponse && (
          <p className="text-[10px] text-text-light mt-0.5">Son: {lastResponse}</p>
        )}
      </div>
    </div>
  );
}
