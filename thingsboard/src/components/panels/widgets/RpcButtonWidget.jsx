"use client";

/**
 * RpcButtonWidget — RPC Komut Butonu
 * Tek tıkla özel RPC komutu gönderir.
 * Config: { method: "reboot", params: {}, buttonLabel: "Yeniden Başlat", buttonColor: "red" }
 */

import { useState, useCallback } from "react";
import { Zap, Loader2, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const COLOR_MAP = {
  purple: {
    bg: "bg-gradient-to-r from-halo-600 to-halo-700 hover:from-halo-700 hover:to-halo-800",
    shadow: "shadow-halo-600/30",
  },
  red: {
    bg: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
    shadow: "shadow-red-500/30",
  },
  green: {
    bg: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
    shadow: "shadow-emerald-500/30",
  },
  blue: {
    bg: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    shadow: "shadow-blue-500/30",
  },
  orange: {
    bg: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
    shadow: "shadow-orange-500/30",
  },
};

export default function RpcButtonWidget({
  devices = [], keys = [], title = "Komut Butonu",
  config = {}, isEditMode = false, widgetId, onConfigChange,
}) {
  const device = devices[0];
  const deviceId = device?.id;
  const deviceName = device?.name || "Bilinmeyen";

  const method = config.method || "execute";
  const params = config.params || {};
  const buttonLabel = config.buttonLabel || method;
  const buttonColor = config.buttonColor || "purple";
  const timeout = config.timeout || 10000;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // "success" | "error" | null

  const handleClick = useCallback(async () => {
    if (!deviceId || isEditMode) return;

    try {
      setLoading(true);
      setResult(null);
      const res = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, method, params, timeout }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult("success");
        toast.success(`${deviceName}: ${method} gönderildi`);
      } else {
        setResult("error");
        toast.error(data.message || "RPC hatası");
      }
    } catch {
      setResult("error");
      toast.error("Bağlantı hatası");
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  }, [deviceId, method, params, timeout, deviceName, isEditMode]);

  const colors = COLOR_MAP[buttonColor] || COLOR_MAP.purple;

  if (!deviceId) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <p className="text-sm">Cihaz seçilmedi</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      {/* Command button */}
      <button
        onClick={handleClick}
        disabled={loading || isEditMode}
        className={`
          flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-base
          transition-all duration-300
          ${colors.bg}
          shadow-lg ${colors.shadow}
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:scale-105 active:scale-95
        `}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : result === "success" ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : result === "error" ? (
          <XCircle className="h-5 w-5" />
        ) : (
          <Zap className="h-5 w-5" />
        )}
        {loading ? "Gönderiliyor..." : result === "success" ? "Başarılı!" : result === "error" ? "Hata!" : buttonLabel}
      </button>

      {/* Info */}
      <div className="text-center">
        <p className="text-xs text-text-muted">{deviceName}</p>
        <p className="text-[10px] text-text-light mt-0.5">Method: {method}</p>
      </div>
    </div>
  );
}
