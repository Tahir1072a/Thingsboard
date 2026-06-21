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
    // Datasource kısıtları
    datasource: {
      maxDevices: null, // null = sınırsız
      maxKeys: 1,
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
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
    ],
    advancedFields: [
      {
        key: "showValues",
        label: "Değerleri Göster",
        type: "toggle",
        defaultValue: true,
      },
      {
        key: "barColor",
        label: "Çubuk Rengi",
        type: "color",
        defaultValue: "#6366f1",
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
    advancedFields: [],
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
        type: "text",
        defaultValue: "",
        placeholder: "°C, %, RPM...",
      },
      {
        key: "decimals",
        label: "Ondalık Hane",
        type: "number",
        defaultValue: 0,
        min: 0,
        max: 5,
      },
    ],
    advancedFields: [
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
        type: "text",
        defaultValue: "",
        placeholder: "°C, %, RPM...",
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
    ],
    advancedFields: [
      {
        key: "subLabel",
        label: "Alt Etiket",
        type: "text",
        defaultValue: "",
        placeholder: "Opsiyonel açıklama",
      },
      {
        key: "showTrend",
        label: "Trend Göster",
        type: "toggle",
        defaultValue: true,
      },
    ],
  },

  stat_card: {
    category: "cards",
    datasource: {
      maxDevices: 1,
      maxKeys: null, // multi-key
      requireDevice: true,
      requireKey: true,
    },
    basicFields: [
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
        key: "maxRows",
        label: "Maks. Satır",
        type: "number",
        defaultValue: 20,
        min: 5,
        max: 100,
      },
    ],
    advancedFields: [
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
    basicFields: [],
    advancedFields: [],
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
        key: "showConfirmation",
        label: "Onay Diyaloğu Göster",
        type: "toggle",
        defaultValue: false,
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
        type: "text",
        defaultValue: "%",
        placeholder: "%, °C...",
      },
    ],
    advancedFields: [
      {
        key: "showConfirmation",
        label: "Onay Diyaloğu Göster",
        type: "toggle",
        defaultValue: false,
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
    ],
    advancedFields: [
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
        key: "showConfirmation",
        label: "Onay Diyaloğu Göster",
        type: "toggle",
        defaultValue: false,
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
        key: "maxRows",
        label: "Maks. Satır",
        type: "number",
        defaultValue: 10,
        min: 5,
        max: 50,
      },
      {
        key: "showCleared",
        label: "Temizlenmiş Alarmları Göster",
        type: "toggle",
        defaultValue: false,
      },
    ],
    advancedFields: [],
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
