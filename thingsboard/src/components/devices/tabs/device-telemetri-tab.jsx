import {
  TableContent,
  TableHeaderSheet,
} from "@/components/common/table/table-header";
import {
  Plus,
  RotateCw,
  LineChart,
  Copy,
  Trash2,
  Hash,
  Type,
  ToggleLeft,
  Braces,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

// Telemetri için farklı bir config - genelde sadece görüntüleme
const TELEMETRY_CONFIG = {
  canAdd: false, // Telemetri cihazdan gelir, manuel eklenmez
  canRefresh: true,
  canSearch: true,
  canDelete: true, // Geçmiş veriyi silebilirsin
  canViewChart: true, // Grafik görüntüleme
};

// Mock Telemetri Verisi
const MOCK_TELEMETRY = [
  {
    id: "1",
    key: "temperature",
    value: "24.5",
    type: "number",
    lastUpdateTs: "2025-11-05 15:41:45",
    unit: "°C",
  },
  {
    id: "2",
    key: "humidity",
    value: "65",
    type: "number",
    lastUpdateTs: "2025-11-05 15:41:45",
    unit: "%",
  },
  {
    id: "3",
    key: "isOnline",
    value: "true",
    type: "boolean",
    lastUpdateTs: "2025-11-05 15:41:42",
    unit: null,
  },
  {
    id: "4",
    key: "status",
    value: "running",
    type: "string",
    lastUpdateTs: "2025-11-05 15:40:30",
    unit: null,
  },
  {
    id: "5",
    key: "errorCount",
    value: "0",
    type: "number",
    lastUpdateTs: "2025-11-05 15:39:00",
    unit: null,
  },
  {
    id: "6",
    key: "location",
    value: '{"lat": 41.0082, "lng": 28.9784}',
    type: "json",
    lastUpdateTs: "2025-11-05 15:35:00",
    unit: null,
  },
  {
    id: "7",
    key: "batteryLevel",
    value: "87",
    type: "number",
    lastUpdateTs: "2025-11-05 15:41:45",
    unit: "%",
  },
  {
    id: "8",
    key: "signalStrength",
    value: "-67",
    type: "number",
    lastUpdateTs: "2025-11-05 15:41:40",
    unit: "dBm",
  },
];

// Veri tipi ikonu
const TypeIcon = ({ type }) => {
  const icons = {
    number: <Hash className="h-3.5 w-3.5" />,
    string: <Type className="h-3.5 w-3.5" />,
    boolean: <ToggleLeft className="h-3.5 w-3.5" />,
    json: <Braces className="h-3.5 w-3.5" />,
  };

  const colors = {
    number: "text-blue-500 bg-blue-50",
    string: "text-green-500 bg-green-50",
    boolean: "text-purple-500 bg-purple-50",
    json: "text-orange-500 bg-orange-50",
  };

  return (
    <div
      className={`p-1 rounded ${colors[type] || "text-gray-500 bg-gray-50"}`}
    >
      {icons[type] || <Type className="h-3.5 w-3.5" />}
    </div>
  );
};

// Değer formatla
const formatValue = (value, type, unit) => {
  if (type === "boolean") {
    return (
      <Badge
        variant="outline"
        className={
          value === "true"
            ? "bg-green-50 text-green-600 border-green-200"
            : "bg-red-50 text-red-600 border-red-200"
        }
      >
        {value === "true" ? "True" : "False"}
      </Badge>
    );
  }

  if (type === "json") {
    return (
      <span className="text-xs font-mono bg-orange-50 text-orange-600 px-2 py-1 rounded truncate max-w-[150px] block">
        {value}
      </span>
    );
  }

  return (
    <span className="font-mono text-text-main">
      {value}
      {unit && <span className="text-text-muted ml-1 text-xs">{unit}</span>}
    </span>
  );
};

// Zaman farkını hesapla
const getTimeAgo = (timestamp) => {
  // Basit bir gösterim - gerçek uygulamada date-fns kullanılabilir
  return timestamp.split(" ")[1]; // Sadece saat kısmı
};

// Tablo kolonları
const columns = [
  {
    id: "key",
    title: "Anahtar",
    span: 3,
    cellRender: (row) => (
      <div className="flex items-center gap-2">
        <TypeIcon type={row.type} />
        <span className="font-medium text-text-main">{row.key}</span>
      </div>
    ),
  },
  {
    id: "value",
    title: "Değer",
    span: 3,
    cellRender: (row) => formatValue(row.value, row.type, row.unit),
  },
  {
    id: "lastUpdateTs",
    title: "Son Güncelleme",
    span: 3,
    cellRender: (row) => (
      <div className="flex items-center gap-1.5 text-sm text-text-muted">
        <Clock className="h-3.5 w-3.5" />
        <span>{getTimeAgo(row.lastUpdateTs)}</span>
      </div>
    ),
  },
];

export function DeviceTelemetryTab({ deviceId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [telemetryData, setTelemetryData] = useState(MOCK_TELEMETRY);



  const [liveData, setLiveData] = useState([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchTelemetry = async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`/api/telemetry?deviceId=${deviceId}&limit=50`);
      const data = await res.json();
      if (data.ok && data.data) {
        // API'den gelen veriyi bizim formata uygun hale getirelim
        const formatted = data.data.map((item) => ({
          id: item._id,
          key: item.key,
          value: typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value),
          type: item.valueType || "string",
          lastUpdateTs: new Date(item.timestamp).toISOString().replace("T", " ").substring(0, 19),
          unit: item.unit,
        }));
        setLiveData(formatted);
      }
    } catch (err) {
      console.error("Telemetry fetch hatası", err);
    }
  };


  useEffect(() => {
    fetchTelemetry();

    if (!deviceId) return;

    // SSE Canlı Bağlantı
    const eventSource = new EventSource(`/api/sse?deviceId=${deviceId}`);
    
    eventSource.onmessage = (e) => {
      // ping vb. mesajları atla
      if (e.data === "connected" || e.data === "ping") return;

      try {
        const item = JSON.parse(e.data);
        const newItem = {
          id: Date.now().toString(), // Benzersiz ID
          key: item.key,
          value: typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value),
          type: item.protocol === "http" && typeof item.value === "object" ? "json" : typeof item.value === "boolean" ? "boolean" : !isNaN(Number(item.value)) ? "number" : "string",
          lastUpdateTs: new Date(item.timestamp).toISOString().replace("T", " ").substring(0, 19),
          unit: item.unit,
        };

        // Gelen veriyi canlı verinin en üstüne ekle, aynı key varsa eskisini sil
        setLiveData((prev) => {
          const filtered = prev.filter(p => p.key !== newItem.key);
          return [newItem, ...filtered];
        });
      } catch (err) {
        // Parse error
      }
    };

    return () => {
      eventSource.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // Combine live data with mock data
  const combinedData = [...liveData, ...telemetryData.filter(m => !liveData.some(l => l.key === m.key))];

  const filteredData = combinedData.filter(
    (item) =>
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.value).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => fetchTelemetry();
  const handleSearch = (value) => setSearchQuery(value);
  const handleViewChart = (row) => console.log("View chart:", row.key);
  const handleDelete = (row) => console.log("Delete telemetry:", row.key);
  const handleRowClick = (row) => console.log("Row clicked:", row);

  const rowActions = [
    {
      label: "Grafik Görüntüle",
      icon: <LineChart />,
      onClick: handleViewChart,
    },
    {
      label: "Anahtarı Kopyala",
      icon: <Copy />,
      onClick: (row) => navigator.clipboard.writeText(row.key),
    },
    {
      label: "Veriyi Sil",
      icon: <Trash2 />,
      onClick: handleDelete,
      className: "text-red-500 hover:text-red-600 hover:bg-red-50/50",
    },
  ];

  // Toplu grafik görüntüleme
  const bulkActions = [
    {
      label: "Seçilenleri Grafikte Göster",
      icon: <LineChart className="h-4 w-4" />,
      onClick: (selected) => console.log("Show chart for:", selected),
    },
    {
      label: "Seçilenleri Sil",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (selected) => console.log("Delete:", selected),
      variant: "destructive",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <TableHeaderSheet
        title="Telemetri"
        actions={[
          {
            icon: <RotateCw className="h-4 w-4" />,
            onClick: handleRefresh,
            tooltip: "Yenile",
          },
          {
            icon: <LineChart className="h-4 w-4" />,
            onClick: () => console.log("Open chart view"),
            tooltip: "Grafik Görünümü",
          },
        ]}
        onSearch={handleSearch}
      />

      <TableContent
        data={filteredData}
        columns={columns}
        title={`${filteredData.length} telemetri anahtarı`}
        onRowClick={handleRowClick}
        rowActions={rowActions}
        bulkActions={bulkActions}
        gridClassName="grid-cols-11"
        emptyState={
          searchQuery
            ? `"${searchQuery}" için sonuç bulunamadı`
            : "Henüz telemetri verisi yok"
        }
        getRowId={(row) => row.id}
      />
    </div>
  );
}
