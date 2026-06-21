/**
 * WidgetSchemas — Her widget tipi için yapılandırma şemaları
 *
 * Her şema, widget'ın Basic ve Advanced ayarlarını tanımlar.
 * WidgetConfigModal bu şemaları kullanarak dinamik form oluşturur.
 */

// Widget kategorileri
export const WIDGET_CATEGORIES = [
  { id: "charts", label: "Grafikler", icon: "BarChart3" },
  { id: "gauges", label: "Göstergeler", icon: "Gauge" },
  { id: "cards", label: "Kartlar", icon: "LayoutGrid" },
  { id: "tables", label: "Tablolar", icon: "Table2" },
  { id: "maps", label: "Haritalar", icon: "MapPin" },
  { id: "control", label: "Kontrol", icon: "Zap" },
  { id: "alarms", label: "Alarm", icon: "Bell" },
];

// Her widget tipi için config şemaları
export const WIDGET_SCHEMAS = {
  // ─── Grafikler ───
  line_chart: {
    category: "charts",
    datasource: {
      maxDevices: null,
      maxKeys: 1,
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
      {
        key: "unit",
        label: "Birim",
        type: "unit_select",
        defaultValue: "",
      },
      {
        key: "strokeWidth",
        label: "Çizgi Kalınlığı",
        type: "number",
        defaultValue: 2,
        min: 1,
        max: 5,
        step: 0.5,
      },
      {
        key: "curveType",
        label: "Eğri Tipi",
        type: "select",
        defaultValue: "monotone",
        options: [
          { label: "Düz (Monotone)", value: "monotone" },
          { label: "Doğrusal (Linear)", value: "linear" },
          { label: "Basamaklı (Step)", value: "step" },
        ],
      },
      {
        key: "warningThreshold",
        label: "Uyarı Eşiği",
        type: "number",
        defaultValue: null,
        placeholder: "Boş bırakılırsa gösterilmez",
      },
      {
        key: "fillArea",
        label: "Alan Doldurma",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "lineColor",
        label: "Çizgi Rengi",
        type: "color",
        defaultValue: "#6366f1",
      },
    ],
    advancedFields: [
      {
        key: "maxPoints",
        label: "Maksimum Nokta",
        type: "number",
        defaultValue: 60,
        min: 10,
        max: 500,
      },
      {
        key: "showGrid",
        label: "Izgara Çizgilerini Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "yAxisLabel",
        label: "Y-Ekseni Başlığı",
        type: "text",
        defaultValue: "",
        placeholder: "Örn: Sıcaklık (°C)",
      },
      {
        key: "showBrush",
        label: "Zoom Kontrolü",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "showLegend",
        label: "Legend Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "showTooltip",
        label: "Tooltip Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "animation",
        label: "Animasyon",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "decimals",
        label: "Ondalık Basamak",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 5,
      },
    ],
  },

  bar_chart: {
    category: "charts",
    datasource: {
      maxDevices: null,
      maxKeys: 1,
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
      {
        key: "unit",
        label: "Birim",
        type: "unit_select",
        defaultValue: "",
      },
      {
        key: "orientation",
        label: "Yön",
        type: "select",
        defaultValue: "vertical",
        options: [
          { label: "Dikey", value: "vertical" },
          { label: "Yatay", value: "horizontal" },
        ],
      },
      {
        key: "maxBars",
        label: "Maks. Çubuk Sayısı",
        type: "number",
        defaultValue: 10,
        min: 2,
        max: 50,
      },
      {
        key: "barColor",
        label: "Çubuk Rengi",
        type: "color",
        defaultValue: "#6366f1",
      },
    ],
    advancedFields: [
      {
        key: "showGrid",
        label: "Izgara Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "barRadius",
        label: "Çubuk Köşe Yuvarlaklığı",
        type: "number",
        defaultValue: 6,
        min: 0,
        max: 20,
      },
      {
        key: "showLegend",
        label: "Legend Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "showTooltip",
        label: "Tooltip Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "animation",
        label: "Animasyon",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "decimals",
        label: "Ondalık Basamak",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 5,
      },
    ],
  },

  pie_chart: {
    category: "charts",
    datasource: {
      maxDevices: null,
      maxKeys: 1,
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
      {
        key: "unit",
        label: "Birim",
        type: "unit_select",
        defaultValue: "",
      },
      {
        key: "variant",
        label: "Tür",
        type: "select",
        defaultValue: "donut",
        options: [
          { label: "Donut", value: "donut" },
          { label: "Pasta", value: "pie" },
        ],
      },
      {
        key: "showLabels",
        label: "Etiketleri Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "showPercentage",
        label: "Yüzdeleri Göster",
        type: "toggle",
        defaultValue: true,
      },
    ],
    advancedFields: [
      {
        key: "innerRadius",
        label: "İç Yarıçap (%)",
        type: "number",
        defaultValue: 55,
        min: 0,
        max: 90,
      },
      {
        key: "outerRadius",
        label: "Dış Yarıçap (%)",
        type: "number",
        defaultValue: 85,
        min: 30,
        max: 100,
      },
      {
        key: "showLegend",
        label: "Legend Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "animation",
        label: "Animasyon",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "decimals",
        label: "Ondalık Basamak",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 5,
      },
    ],
  },

  // ─── Göstergeler ───
  gauge: {
    category: "gauges",
    datasource: {
      maxDevices: 1,
      maxKeys: 1,
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
      {
        key: "min",
        label: "Min Değer",
        type: "number",
        defaultValue: 0,
      },
      {
        key: "max",
        label: "Max Değer",
        type: "number",
        defaultValue: 100,
      },
      {
        key: "unit",
        label: "Birim",
        type: "unit_select",
        defaultValue: "",
      },
      {
        key: "colorRanges",
        label: "Renk Aralıkları",
        type: "colorRanges",
        defaultValue: [
          { from: 0, to: 50, color: "#22c55e" },
          { from: 50, to: 80, color: "#f59e0b" },
          { from: 80, to: 100, color: "#ef4444" },
        ],
      },
    ],
    advancedFields: [
      {
        key: "decimals",
        label: "Ondalık Hane",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 5,
      },
      {
        key: "barSize",
        label: "Çubuk Kalınlığı (px)",
        type: "number",
        defaultValue: 14,
        min: 6,
        max: 30,
      },
      {
        key: "startAngle",
        label: "Başlangıç Açısı",
        type: "number",
        defaultValue: 210,
        min: 0,
        max: 360,
      },
      {
        key: "endAngle",
        label: "Bitiş Açısı",
        type: "number",
        defaultValue: -30,
        min: -360,
        max: 360,
      },
      {
        key: "showPercentage",
        label: "Yüzde Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "animation",
        label: "Animasyon",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "showTitle",
        label: "Başlığı Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "backgroundColor",
        label: "Arka Plan Rengi",
        type: "color",
        defaultValue: "transparent",
      },
    ],
  },

  // ─── Kartlar ───
  value_card: {
    category: "cards",
    datasource: {
      maxDevices: 1,
      maxKeys: 1,
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
      {
        key: "unit",
        label: "Birim",
        type: "unit_select",
        defaultValue: "",
      },
      {
        key: "showTrend",
        label: "Trend Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "icon",
        label: "İkon",
        type: "select",
        defaultValue: "Thermometer",
        options: [
          { label: "🌡️ Termometre", value: "Thermometer" },
          { label: "💧 Damla", value: "Droplets" },
          { label: "⚡ Enerji", value: "Zap" },
          { label: "🔋 Batarya", value: "Battery" },
          { label: "☀️ Güneş", value: "Sun" },
          { label: "🌬️ Rüzgar", value: "Wind" },
          { label: "📊 Grafik", value: "BarChart3" },
          { label: "⚙️ Dişli", value: "Settings" },
          { label: "📍 Konum", value: "MapPin" },
          { label: "🔔 Bildirim", value: "Bell" },
        ],
      },
      {
        key: "accentColor",
        label: "Vurgu Rengi",
        type: "color",
        defaultValue: "#6366f1",
      },
    ],
    advancedFields: [
      {
        key: "fontSize",
        label: "Değer Font Boyutu",
        type: "select",
        defaultValue: "text-4xl",
        options: [
          { label: "Küçük", value: "text-2xl" },
          { label: "Normal", value: "text-4xl" },
          { label: "Büyük", value: "text-5xl" },
          { label: "Çok Büyük", value: "text-6xl" },
        ],
      },
      {
        key: "decimals",
        label: "Ondalık Hane",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 5,
      },
      {
        key: "showLastUpdate",
        label: "Son Güncelleme Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "animation",
        label: "Animasyon",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  stat_card: {
    category: "cards",
    datasource: {
      maxDevices: 1,
      maxKeys: null,
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
      {
        key: "unit",
        label: "Birim",
        type: "unit_select",
        defaultValue: "",
      },
      {
        key: "layout",
        label: "Düzen",
        type: "select",
        defaultValue: "grid",
        options: [
          { label: "Izgara (Grid)", value: "grid" },
          { label: "Liste", value: "list" },
        ],
      },
      {
        key: "columns",
        label: "Sütun Sayısı",
        type: "number",
        defaultValue: 3,
        min: 1,
        max: 6,
      },
    ],
    advancedFields: [
      {
        key: "showTrend",
        label: "Trend Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "showSparkline",
        label: "Mini Grafik Göster",
        type: "toggle",
        defaultValue: false,
      },
      {
        key: "decimals",
        label: "Ondalık Basamak",
        type: "number",
        defaultValue: 1,
        min: 0,
        max: 5,
      },
    ],
  },

  // ─── Tablolar ───
  table: {
    category: "tables",
    datasource: {
      maxDevices: null,
      maxKeys: null,
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
      {
        key: "rowLimit",
        label: "Satır Limiti",
        type: "number",
        defaultValue: 50,
        min: 5,
        max: 200,
      },
      {
        key: "sortOrder",
        label: "Sıralama",
        type: "select",
        defaultValue: "desc",
        options: [
          { label: "Yeniden Eskiye", value: "desc" },
          { label: "Eskiden Yeniye", value: "asc" },
        ],
      },
    ],
    advancedFields: [
      {
        key: "striped",
        label: "Zebra Çizgili",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "pagination",
        label: "Sayfalama",
        type: "toggle",
        defaultValue: false,
      },
      {
        key: "pageSize",
        label: "Sayfa Boyutu",
        type: "number",
        defaultValue: 10,
        min: 5,
        max: 50,
      },
      {
        key: "decimals",
        label: "Ondalık Basamak",
        type: "number",
        defaultValue: 2,
        min: 0,
        max: 5,
      },
      {
        key: "showDeviceName",
        label: "Cihaz Adı Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "showTimestamp",
        label: "Zaman Damgası Göster",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  // ─── Haritalar ───
  geo_map: {
    category: "maps",
    datasource: {
      maxDevices: null,
      maxKeys: null,
      requireDevice: true,
      requireKey: false,
    },
    basicFields: [
      {
        key: "latitudeKey",
        label: "Enlem Anahtarı",
        type: "text",
        defaultValue: "latitude",
      },
      {
        key: "longitudeKey",
        label: "Boylam Anahtarı",
        type: "text",
        defaultValue: "longitude",
      },
      {
        key: "defaultZoom",
        label: "Varsayılan Zoom",
        type: "number",
        defaultValue: 10,
        min: 1,
        max: 18,
      },
    ],
    advancedFields: [
      {
        key: "showTooltips",
        label: "Tooltip Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "fitBounds",
        label: "Cihazlara Sığdır",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "tileLayer",
        label: "Harita Tipi",
        type: "select",
        defaultValue: "osm",
        options: [
          { label: "OpenStreetMap", value: "osm" },
          { label: "Uydu", value: "satellite" },
          { label: "Karanlık", value: "dark" },
        ],
      },
      {
        key: "clustering",
        label: "Kümeleme",
        type: "toggle",
        defaultValue: false,
      },
    ],
  },

  image_map: {
    category: "maps",
    datasource: {
      maxDevices: null,
      maxKeys: null,
      requireDevice: false,
      requireKey: false,
    },
    basicFields: [
      {
        key: "markerSize",
        label: "Marker Boyutu (px)",
        type: "number",
        defaultValue: 24,
        min: 12,
        max: 48,
      },
    ],
    advancedFields: [
      {
        key: "markerColor",
        label: "Varsayılan Marker Rengi",
        type: "color",
        defaultValue: "#6366f1",
      },
      {
        key: "showTooltips",
        label: "Tooltip Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "showValueLabel",
        label: "Değer Etiketi Göster",
        type: "toggle",
        defaultValue: false,
      },
    ],
  },

  // ─── Kontrol (RPC) ───
  rpc_switch: {
    category: "control",
    datasource: {
      maxDevices: 1,
      maxKeys: null,
      requireDevice: true,
      requireKey: false,
    },
    basicFields: [
      {
        key: "method",
        label: "RPC Metodu",
        type: "text",
        defaultValue: "setValue",
        placeholder: "setValue",
      },
      {
        key: "paramKey",
        label: "Parametre Anahtarı",
        type: "text",
        defaultValue: "value",
        placeholder: "value",
      },
    ],
    advancedFields: [
      {
        key: "confirmAction",
        label: "Onay Diyaloğu Göster",
        type: "toggle",
        defaultValue: false,
      },
      {
        key: "timeout",
        label: "Zaman Aşımı (ms)",
        type: "number",
        defaultValue: 10000,
        min: 1000,
        max: 60000,
        step: 1000,
      },
      {
        key: "activeColor",
        label: "Aktif Renk",
        type: "color",
        defaultValue: "#22c55e",
      },
    ],
  },

  rpc_slider: {
    category: "control",
    datasource: {
      maxDevices: 1,
      maxKeys: null,
      requireDevice: true,
      requireKey: false,
    },
    basicFields: [
      {
        key: "method",
        label: "RPC Metodu",
        type: "text",
        defaultValue: "setValue",
        placeholder: "setValue",
      },
      {
        key: "paramKey",
        label: "Parametre Anahtarı",
        type: "text",
        defaultValue: "value",
      },
      {
        key: "min",
        label: "Min Değer",
        type: "number",
        defaultValue: 0,
      },
      {
        key: "max",
        label: "Max Değer",
        type: "number",
        defaultValue: 100,
      },
      {
        key: "step",
        label: "Adım",
        type: "number",
        defaultValue: 1,
        min: 0.1,
      },
      {
        key: "unit",
        label: "Birim",
        type: "unit_select",
        defaultValue: "percent",
      },
    ],
    advancedFields: [
      {
        key: "confirmAction",
        label: "Onay Diyaloğu Göster",
        type: "toggle",
        defaultValue: false,
      },
      {
        key: "timeout",
        label: "Zaman Aşımı (ms)",
        type: "number",
        defaultValue: 10000,
        min: 1000,
        max: 60000,
        step: 1000,
      },
      {
        key: "sliderColor",
        label: "Slider Rengi",
        type: "color",
        defaultValue: "#6366f1",
      },
    ],
  },

  rpc_button: {
    category: "control",
    datasource: {
      maxDevices: 1,
      maxKeys: null,
      requireDevice: true,
      requireKey: false,
    },
    basicFields: [
      {
        key: "method",
        label: "RPC Metodu",
        type: "text",
        defaultValue: "execute",
        placeholder: "execute",
      },
      {
        key: "buttonLabel",
        label: "Buton Yazısı",
        type: "text",
        defaultValue: "Çalıştır",
        placeholder: "Çalıştır",
      },
      {
        key: "buttonColor",
        label: "Buton Rengi",
        type: "select",
        defaultValue: "purple",
        options: [
          { label: "Mor", value: "purple" },
          { label: "Kırmızı", value: "red" },
          { label: "Yeşil", value: "green" },
          { label: "Mavi", value: "blue" },
          { label: "Turuncu", value: "orange" },
        ],
      },
      {
        key: "icon",
        label: "İkon",
        type: "select",
        defaultValue: "Zap",
        options: [
          { label: "⚡ Yıldırım", value: "Zap" },
          { label: "▶️ Oynat", value: "Play" },
          { label: "🔄 Yenile", value: "RefreshCw" },
          { label: "⚙️ Dişli", value: "Settings" },
          { label: "🔌 Güç", value: "Power" },
          { label: "📤 Gönder", value: "Send" },
        ],
      },
    ],
    advancedFields: [
      {
        key: "confirmAction",
        label: "Onay Diyaloğu Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "confirmMessage",
        label: "Onay Mesajı",
        type: "text",
        defaultValue: "",
        placeholder: "Bu işlemi gerçekleştirmek istediğinize emin misiniz?",
      },
      {
        key: "timeout",
        label: "Zaman Aşımı (ms)",
        type: "number",
        defaultValue: 10000,
        min: 1000,
        max: 60000,
        step: 1000,
      },
    ],
  },

  // ─── Alarm ───
  alarm_list: {
    category: "alarms",
    datasource: {
      maxDevices: null,
      maxKeys: null,
      requireDevice: true,
      requireKey: false,
    },
    basicFields: [
      {
        key: "maxAlarms",
        label: "Maks. Alarm Sayısı",
        type: "number",
        defaultValue: 20,
        min: 5,
        max: 100,
      },
      {
        key: "showCleared",
        label: "Temizlenmiş Alarmları Göster",
        type: "toggle",
        defaultValue: false,
      },
      {
        key: "severityFilter",
        label: "Önem Seviyesi Filtresi",
        type: "select",
        defaultValue: "all",
        options: [
          { label: "Tümü", value: "all" },
          { label: "Kritik", value: "CRITICAL" },
          { label: "Büyük", value: "MAJOR" },
          { label: "Küçük", value: "MINOR" },
          { label: "Uyarı", value: "WARNING" },
        ],
      },
    ],
    advancedFields: [
      {
        key: "autoRefresh",
        label: "Otomatik Yenile",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "refreshInterval",
        label: "Yenileme Sıklığı (sn)",
        type: "number",
        defaultValue: 30,
        min: 5,
        max: 300,
      },
      {
        key: "soundEnabled",
        label: "Ses Bildirimi",
        type: "toggle",
        defaultValue: false,
      },
    ],
  },
};

/**
 * Widget tipi için varsayılan config oluştur.
 * Tüm basicFields + advancedFields defaultValue'larını toplar.
 */
export function getDefaultConfig(widgetType) {
  const schema = WIDGET_SCHEMAS[widgetType];
  if (!schema) return {};

  const config = {};
  [...schema.basicFields, ...schema.advancedFields].forEach((field) => {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      config[field.key] = field.defaultValue;
    }
  });
  return config;
}

/**
 * Widget tipinin veri kaynağı kısıtlarını getir.
 */
export function getDatasourceConstraints(widgetType) {
  const schema = WIDGET_SCHEMAS[widgetType];
  if (!schema) return { maxDevices: null, maxKeys: null, requireDevice: true, requireKey: true };
  return schema.datasource;
}
