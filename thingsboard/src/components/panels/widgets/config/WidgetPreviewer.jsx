"use client";

/**
 * WidgetPreviewer — Canlı widget ön izleme bileşeni
 *
 * WidgetConfigModal içinde, kullanıcı ayarları değiştirdikçe
 * widget'ın nasıl görüneceğini gösterir.
 * Mock data veya gerçek cihazın son telemetri değerini kullanır.
 */

import { useState, useEffect, useMemo } from "react";
import WidgetRenderer from "@/components/panels/WidgetRenderer";
import { Eye, Monitor } from "lucide-react";

// Widget tiplerine göre mock veriler
const MOCK_DATA = {
  gauge: 67.5,
  value_card: 42.3,
  line_chart: null, // LineChart kendi mock verisini üretir
  bar_chart: null,
  pie_chart: null,
  stat_card: null,
  table: null,
  alarm_list: null,
  geo_map: null,
  image_map: null,
  rpc_switch: null,
  rpc_slider: null,
  rpc_button: null,
};

export default function WidgetPreviewer({
  widgetType,
  config = {},
  devices = [],
  keys = [],
  title = "Widget Ön İzleme",
}) {
  if (!widgetType) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted/60 gap-3">
        <Monitor className="h-16 w-16" strokeWidth={1} />
        <span className="text-sm font-medium">Widget tipi seçin</span>
        <span className="text-xs text-text-muted/40">Ön izleme burada görünecek</span>
      </div>
    );
  }

  // Preview widget objesi oluştur
  const previewWidget = useMemo(() => ({
    i: "preview-widget",
    type: widgetType,
    devices: devices.length > 0 ? devices : [
      { id: "mock-device-1", name: "Demo Cihaz" },
    ],
    keys: keys.length > 0 ? keys : ["value"],
    title: title || "Ön İzleme",
    config: { ...config },
    x: 0,
    y: 0,
    w: 6,
    h: 4,
  }), [widgetType, devices, keys, title, config]);

  return (
    <div className="h-full flex flex-col">
      {/* Preview başlığı */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Eye className="h-4 w-4 text-halo-500" />
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Canlı Ön İzleme
        </span>
      </div>

      {/* Widget render alanı */}
      <div className="flex-1 min-h-0 rounded-xl border-2 border-dashed border-gray-200/60 bg-gray-50/30 overflow-hidden">
        <div className="h-full w-full p-2">
          <WidgetRenderer
            widget={previewWidget}
            isEditMode={false}
            onDelete={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
