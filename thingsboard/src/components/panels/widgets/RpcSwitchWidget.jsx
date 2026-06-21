"use client";

/**
 * RpcSwitchWidget — RPC Anahtar Kontrolü
 * Cihaza açma/kapama komutu gönderir.
 * Config: { method: "setValue", paramKey: "value", onValue: true, offValue: false }
 */

import { useState, useCallback } from "react";
import { Power, Loader2 } from "lucide-react";
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

  const [isOn, setIsOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

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
          params: { [paramKey]: newState ? onValue : offValue },
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
