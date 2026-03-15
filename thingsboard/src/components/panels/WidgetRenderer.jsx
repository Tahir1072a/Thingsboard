"use client";

/**
 * WidgetRenderer — Widget Factory
 *
 * Widget type'a göre doğru bileşeni render eder.
 * react-grid-layout item'ları içinde kullanılır.
 */

import LineChartWidget from "./widgets/LineChartWidget";
import GaugeWidget from "./widgets/GaugeWidget";
import ValueCardWidget from "./widgets/ValueCardWidget";
import TableWidget from "./widgets/TableWidget";
import { BarChart3, Gauge, Hash, Table2, AlertCircle } from "lucide-react";

const WIDGET_MAP = {
  line_chart: LineChartWidget,
  gauge: GaugeWidget,
  value_card: ValueCardWidget,
  table: TableWidget,
};

export const WIDGET_TYPES = [
  {
    type: "line_chart",
    label: "Çizgi Grafik",
    icon: BarChart3,
    description: "Zaman serisi verisi",
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: "gauge",
    label: "Gösterge",
    icon: Gauge,
    description: "Anlık değer göstergesi",
    defaultSize: { w: 3, h: 4 },
  },
  {
    type: "value_card",
    label: "Değer Kartı",
    icon: Hash,
    description: "Büyük sayı + trend",
    defaultSize: { w: 3, h: 3 },
  },
  {
    type: "table",
    label: "Tablo",
    icon: Table2,
    description: "Son veri kayıtları",
    defaultSize: { w: 6, h: 4 },
  },
];

export default function WidgetRenderer({ widget }) {
  const Component = WIDGET_MAP[widget.type];

  if (!Component) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-muted">
        <AlertCircle className="h-8 w-8 mb-2" />
        <span className="text-sm">Bilinmeyen widget tipi: {widget.type}</span>
      </div>
    );
  }

  return (
    <Component
      deviceId={widget.deviceId}
      keys={widget.keys || []}
      title={widget.title}
      config={widget.config || {}}
    />
  );
}
