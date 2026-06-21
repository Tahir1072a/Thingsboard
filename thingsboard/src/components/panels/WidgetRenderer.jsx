"use client";

/**
 * WidgetRenderer — Widget Factory
 *
 * Widget type'a göre doğru bileşeni render eder.
 * BaseWidgetCard ile sarmalayarak tutarlı görünüm sağlar.
 * react-grid-layout item'ları içinde kullanılır.
 *
 * publicToken prop'u verildiğinde, widget'lar telemetriyi
 * public API üzerinden polling ile alır (SSE yerine).
 */

import LineChartWidget from "./widgets/LineChartWidget";
import GaugeWidget from "./widgets/GaugeWidget";
import ValueCardWidget from "./widgets/ValueCardWidget";
import TableWidget from "./widgets/TableWidget";
import ImageMapWidget from "./widgets/ImageMapWidget";
import BarChartWidget from "./widgets/BarChartWidget";
import PieChartWidget from "./widgets/PieChartWidget";
import StatCardWidget from "./widgets/StatCardWidget";
import AlarmWidget from "./widgets/AlarmWidget";
import RpcSwitchWidget from "./widgets/RpcSwitchWidget";
import RpcSliderWidget from "./widgets/RpcSliderWidget";
import RpcButtonWidget from "./widgets/RpcButtonWidget";
import BaseWidgetCard from "./BaseWidgetCard";
import { BarChart3, Gauge, Hash, Table2, Map, AlertCircle, PieChart, LayoutGrid, Bell, MapPin, Power, SlidersHorizontal, Zap } from "lucide-react";
import dynamic from "next/dynamic";

// Leaflet requires browser window — must use dynamic import with ssr: false
const MapWidget = dynamic(() => import("./widgets/MapWidget"), { ssr: false });

const WIDGET_MAP = {
  line_chart: LineChartWidget,
  gauge: GaugeWidget,
  value_card: ValueCardWidget,
  table: TableWidget,
  image_map: ImageMapWidget,
  bar_chart: BarChartWidget,
  pie_chart: PieChartWidget,
  stat_card: StatCardWidget,
  alarm_list: AlarmWidget,
  geo_map: MapWidget,
  rpc_switch: RpcSwitchWidget,
  rpc_slider: RpcSliderWidget,
  rpc_button: RpcButtonWidget,
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
  {
    type: "image_map",
    label: "Kat Planı",
    icon: Map,
    description: "2D plan üzerinde cihaz konumları",
    defaultSize: { w: 6, h: 5 },
  },
  {
    type: "bar_chart",
    label: "Çubuk Grafik",
    icon: BarChart3,
    description: "Karşılaştırmalı çubuk grafik",
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: "pie_chart",
    label: "Pasta Grafik",
    icon: PieChart,
    description: "Dağılım ve oran gösterimi",
    defaultSize: { w: 4, h: 4 },
  },
  {
    type: "stat_card",
    label: "Çoklu Metrik",
    icon: LayoutGrid,
    description: "Birden fazla metriği yan yana göster",
    defaultSize: { w: 6, h: 3 },
  },
  {
    type: "alarm_list",
    label: "Alarm Listesi",
    icon: Bell,
    description: "Cihaz alarmlarını canlı göster",
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: "geo_map",
    label: "Harita",
    icon: MapPin,
    description: "Cihaz konumlarını harita üzerinde göster",
    defaultSize: { w: 6, h: 5 },
  },
  {
    type: "rpc_switch",
    label: "RPC Anahtar",
    icon: Power,
    description: "Cihazı açma/kapama kontrolü",
    defaultSize: { w: 3, h: 4 },
  },
  {
    type: "rpc_slider",
    label: "RPC Kaydırıcı",
    icon: SlidersHorizontal,
    description: "Sayısal değer gönderme kontrolü",
    defaultSize: { w: 4, h: 4 },
  },
  {
    type: "rpc_button",
    label: "RPC Komut",
    icon: Zap,
    description: "Tek tıkla özel RPC komutu",
    defaultSize: { w: 3, h: 3 },
  },
];

export default function WidgetRenderer({
  widget,
  isEditMode = false,
  onDelete,
  onEdit,
  onWidgetConfigChange,
  publicToken,
}) {
  const Component = WIDGET_MAP[widget.type];

  if (!Component) {
    return (
      <BaseWidgetCard title="Hata" isEditMode={isEditMode} onDelete={onDelete}>
        <div className="h-full flex flex-col items-center justify-center text-text-muted">
          <AlertCircle className="h-8 w-8 mb-2" />
          <span className="text-sm">Bilinmeyen widget tipi: {widget.type}</span>
        </div>
      </BaseWidgetCard>
    );
  }

  return (
    <BaseWidgetCard
      title={widget.title}
      isEditMode={isEditMode}
      onDelete={onDelete}
      onEdit={onEdit ? () => onEdit(widget) : undefined}
    >
      <Component
        devices={widget.devices || []}
        keys={widget.keys || []}
        title={widget.title}
        config={widget.config || {}}
        isEditMode={isEditMode}
        widgetId={widget.i}
        onConfigChange={onWidgetConfigChange}
        publicToken={publicToken}
      />
    </BaseWidgetCard>
  );
}
