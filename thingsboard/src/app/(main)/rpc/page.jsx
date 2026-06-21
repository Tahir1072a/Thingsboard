"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Eye,
  Send,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  TableContent,
  TableHeader,
} from "@/components/common/table/table-header";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// --- Helpers ---
const statusLabels = {
  QUEUED: "Kuyrukta",
  PENDING: "Bekliyor",
  DELIVERED: "Teslim Edildi",
  SUCCESS: "Başarılı",
  TIMEOUT: "Zaman Aşımı",
  ERROR: "Hata",
  EXPIRED: "Süresi Doldu",
};

const statusColors = {
  QUEUED: "bg-orange-500/10 text-orange-600",
  PENDING: "bg-yellow-500/10 text-yellow-600",
  DELIVERED: "bg-blue-500/10 text-blue-600",
  SUCCESS: "bg-green-500/10 text-green-600",
  TIMEOUT: "bg-red-500/10 text-red-600",
  ERROR: "bg-red-500/10 text-red-600",
  EXPIRED: "bg-gray-500/10 text-gray-600",
};

const directionLabels = {
  SERVER_TO_DEVICE: "↓ Cihaza",
  DEVICE_TO_SERVER: "↑ Sunucuya",
};

const directionColors = {
  SERVER_TO_DEVICE: "bg-purple-500/10 text-purple-600",
  DEVICE_TO_SERVER: "bg-teal-500/10 text-teal-600",
};

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

// --- Send RPC Modal ---
function SendRpcModal({ open, onOpenChange, onSuccess }) {
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const [deviceId, setDeviceId] = useState("");
  const [method, setMethod] = useState("");
  const [params, setParams] = useState("");
  const [timeout, setTimeout_] = useState(10000);
  const [oneWay, setOneWay] = useState(false);
  const [persistent, setPersistent] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch devices for selector
  useEffect(() => {
    if (!open) return;
    const fetchDevices = async () => {
      try {
        setDevicesLoading(true);
        const res = await fetch("/api/devices");
        const data = await res.json();
        if (res.ok && data.ok) {
          setDevices(data.data || []);
        }
      } catch {
        toast.error("Cihaz listesi yüklenemedi");
      } finally {
        setDevicesLoading(false);
      }
    };
    fetchDevices();
  }, [open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDeviceId("");
      setMethod("");
      setParams("");
      setTimeout_(10000);
      setOneWay(false);
      setPersistent(false);
    }
  }, [open]);

  const handleSend = async () => {
    if (!deviceId) {
      toast.error("Lütfen bir cihaz seçin");
      return;
    }
    if (!method.trim()) {
      toast.error("Lütfen bir method girin");
      return;
    }

    // Validate JSON params if provided
    let parsedParams = {};
    if (params.trim()) {
      try {
        parsedParams = JSON.parse(params);
      } catch {
        toast.error("Parametreler geçerli bir JSON formatında olmalıdır");
        return;
      }
    }

    try {
      setSending(true);
      const res = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          method: method.trim(),
          params: parsedParams,
          timeout: Number(timeout),
          oneWay,
          persistent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("RPC komutu başarıyla gönderildi");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.message || "RPC komutu gönderilemedi");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
            <div className="p-2 bg-halo-100 rounded-lg">
              <Zap className="h-6 w-6 text-halo-600" />
            </div>
            Yeni RPC Komutu
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Device selector */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Cihaz</Label>
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger className="h-14 w-full px-4 text-base bg-white/90 border-gray-200 focus:ring-2 focus:ring-halo-600 cursor-pointer">
                <SelectValue placeholder={devicesLoading ? "Yükleniyor..." : "Cihaz seçiniz"} />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200 shadow-xl">
                {devices.map((device) => (
                  <SelectItem
                    key={device._id || device.id}
                    value={device._id || device.id}
                    className="py-3 cursor-pointer focus:bg-halo-50"
                  >
                    {device.name || device.label || device._id || device.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Method input */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Method</Label>
            <Input
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="setValue, getStatus, reboot..."
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600"
            />
          </div>

          {/* Params textarea */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Parametreler (JSON)</Label>
            <textarea
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder={'{ "pin": 1, "value": true }'}
              rows={4}
              className="w-full px-4 py-3 text-base bg-white/90 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-halo-600 font-mono text-sm resize-none"
            />
          </div>

          {/* Timeout input */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Zaman Aşımı (ms)</Label>
            <Input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout_(Number(e.target.value))}
              placeholder="10000"
              className="h-14 px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600"
            />
          </div>

          {/* One-Way toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-gray-200">
            <div>
              <Label className="text-base font-bold text-text-main">Tek Yönlü (One-Way)</Label>
              <p className="text-sm text-text-muted mt-0.5">
                Yanıt beklenmez
              </p>
            </div>
            <Switch checked={oneWay} onCheckedChange={setOneWay} />
          </div>

          {/* Persistent toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 border border-gray-200">
            <div>
              <Label className="text-base font-bold text-text-main">Kalıcı (Persistent)</Label>
              <p className="text-sm text-text-muted mt-0.5">
                Cihaz offline ise kuyrukta bekler
              </p>
            </div>
            <Switch checked={persistent} onCheckedChange={setPersistent} />
          </div>
        </div>

        <DialogFooter className="bg-halo-50/30 px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
          >
            İptal
          </Button>
          <Button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="h-12 px-8 text-base bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30 transition-all flex items-center"
          >
            {sending ? "Gönderiliyor..." : "Gönder"}
            {!sending && <Send className="ml-2 h-5 w-5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Detail Modal ---
function RpcDetailModal({ open, onOpenChange, rpc, devicesMap }) {
  if (!rpc) return null;

  const deviceName = devicesMap[rpc.deviceId] || rpc.deviceId || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
            <div className="p-2 bg-halo-100 rounded-lg">
              <Eye className="h-6 w-6 text-halo-600" />
            </div>
            RPC Detayı
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Cihaz</Label>
            <p className="text-sm text-text-muted">{deviceName}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Method</Label>
            <p className="text-sm font-mono text-text-muted">{rpc.method || "—"}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Parametreler</Label>
            <pre className="text-sm font-mono bg-gray-50 rounded-lg p-3 overflow-x-auto text-text-muted">
              {rpc.params ? JSON.stringify(rpc.params, null, 2) : "—"}
            </pre>
          </div>
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Durum</Label>
            <div>
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent font-medium",
                  statusColors[rpc.status] || "bg-gray-500/10 text-gray-600"
                )}
              >
                {statusLabels[rpc.status] || rpc.status}
              </Badge>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Yön</Label>
            <div>
              <Badge
                variant="outline"
                className={cn(
                  "border-transparent font-medium",
                  directionColors[rpc.direction] || "bg-gray-500/10 text-gray-600"
                )}
              >
                {directionLabels[rpc.direction] || rpc.direction || "—"}
              </Badge>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Zaman Aşımı</Label>
            <p className="text-sm text-text-muted">{rpc.timeout || "—"} ms</p>
          </div>
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Tek Yönlü</Label>
            <p className="text-sm text-text-muted">{rpc.oneWay ? "Evet" : "Hayır"}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Kalıcı</Label>
            <p className="text-sm text-text-muted">{rpc.persistent ? "Evet" : "Hayır"}</p>
          </div>
          {rpc.persistent && (
            <>
              <div className="space-y-1">
                <Label className="text-base font-bold text-text-main">Geçerlilik Süresi</Label>
                <p className="text-sm text-text-muted">
                  {rpc.expirationTime ? new Date(rpc.expirationTime).toLocaleString("tr-TR") : "Sınırsız"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-base font-bold text-text-main">Yeniden Deneme</Label>
                <p className="text-sm text-text-muted">
                  {rpc.retries || 0} toplam / {rpc.retriesLeft ?? rpc.retries ?? 0} kalan
                </p>
              </div>
            </>
          )}
          {rpc.errorMessage && (
            <div className="space-y-1">
              <Label className="text-base font-bold text-text-main">Hata Mesajı</Label>
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{rpc.errorMessage}</p>
            </div>
          )}
          {rpc.completedAt && (
            <div className="space-y-1">
              <Label className="text-base font-bold text-text-main">Tamamlanma Zamanı</Label>
              <p className="text-sm text-text-muted">
                {new Date(rpc.completedAt).toLocaleString("tr-TR")}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Yanıt</Label>
            <pre className="text-sm font-mono bg-gray-50 rounded-lg p-3 overflow-x-auto text-text-muted">
              {rpc.response ? JSON.stringify(rpc.response, null, 2) : "—"}
            </pre>
          </div>
          <div className="space-y-1">
            <Label className="text-base font-bold text-text-main">Oluşturulma</Label>
            <p className="text-sm text-text-muted">
              {rpc.createdAt ? new Date(rpc.createdAt).toLocaleString("tr-TR") : "—"}
            </p>
          </div>
        </div>

        <DialogFooter className="bg-halo-50/30 px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 px-6 text-base border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
          >
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function RpcPage() {
  const [openSend, setOpenSend] = useState(false);
  const [detailRpc, setDetailRpc] = useState(null);

  const [rpcs, setRpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [devicesMap, setDevicesMap] = useState({});

  const [pageParams, setPageParams] = useState({
    page: 1,
    limit: 20,
  });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    direction: "",
  });

  // Fetch devices map for name resolution
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch("/api/devices");
        const data = await res.json();
        if (res.ok && data.ok) {
          const map = {};
          (data.data || []).forEach((d) => {
            const id = d._id || d.id;
            map[id] = d.name || d.label || id;
          });
          setDevicesMap(map);
        }
      } catch {
        // Silent fail for device map
      }
    };
    fetchDevices();
  }, []);

  // Fetch RPCs
  const fetchRpcs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);

      if (filters.search) params.append("search", filters.search);
      if (filters.status && filters.status !== "all")
        params.append("status", filters.status);
      if (filters.direction && filters.direction !== "all")
        params.append("direction", filters.direction);

      const res = await fetch(`/api/rpc?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        setRpcs(data.data || []);
        setMeta({
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1,
        });
      } else {
        toast.error(data.message || "Veriler alınamadı");
      }
    } catch {
      toast.error("RPC geçmişi yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchRpcs();
  }, [fetchRpcs]);

  // Filter config
  const filterConfig = [
    {
      key: "status",
      placeholder: "Durum",
      options: [
        { label: "Bekliyor", value: "PENDING" },
        { label: "Teslim Edildi", value: "DELIVERED" },
        { label: "Başarılı", value: "SUCCESS" },
        { label: "Zaman Aşımı", value: "TIMEOUT" },
        { label: "Hata", value: "ERROR" },
        { label: "Kuyrukta", value: "QUEUED" },
      ],
    },
    {
      key: "direction",
      placeholder: "Yön",
      options: [
        { label: "Cihaza", value: "SERVER_TO_DEVICE" },
        { label: "Sunucuya", value: "DEVICE_TO_SERVER" },
      ],
    },
  ];

  // Column definitions
  const columns = [
    {
      id: "device",
      title: "Cihaz",
      span: 2,
      cellRender: (rpc) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-halo-400 to-halo-600 shadow-sm group-hover:scale-105 transition-transform">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-main truncate">
              {devicesMap[rpc.deviceId] || rpc.deviceId || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "method",
      title: "Method",
      span: 2,
      cellRender: (rpc) => (
        <span className="font-mono text-sm text-text-main truncate">
          {rpc.method || "—"}
        </span>
      ),
    },
    {
      id: "params",
      title: "Parametreler",
      span: 2,
      cellRender: (rpc) => {
        const paramStr = rpc.params ? JSON.stringify(rpc.params) : "—";
        const truncated = paramStr.length > 50 ? paramStr.slice(0, 50) + "…" : paramStr;
        return (
          <span className="font-mono text-xs text-text-muted truncate" title={paramStr}>
            {truncated}
          </span>
        );
      },
    },
    {
      id: "status",
      title: "Durum",
      span: 1,
      cellRender: (rpc) => (
        <Badge
          variant="outline"
          className={cn(
            "border-transparent font-medium",
            statusColors[rpc.status] || "bg-gray-500/10 text-gray-600"
          )}
        >
          {statusLabels[rpc.status] || rpc.status || "—"}
        </Badge>
      ),
    },
    {
      id: "direction",
      title: "Yön",
      span: 1,
      cellRender: (rpc) => (
        <Badge
          variant="outline"
          className={cn(
            "border-transparent font-medium text-xs",
            directionColors[rpc.direction] || "bg-gray-500/10 text-gray-600"
          )}
        >
          {directionLabels[rpc.direction] || rpc.direction || "—"}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      title: "Zaman",
      span: 1,
      cellRender: (rpc) => (
        <span className="text-sm text-text-muted truncate">
          {timeAgo(rpc.createdAt)}
        </span>
      ),
    },
    {
      id: "response",
      title: "Yanıt",
      span: 1,
      cellRender: (rpc) => {
        if (!rpc.response) {
          return <span className="text-sm text-text-muted">—</span>;
        }
        const resStr = typeof rpc.response === "string"
          ? rpc.response
          : JSON.stringify(rpc.response);
        const preview = resStr.length > 20 ? resStr.slice(0, 20) + "…" : resStr;
        return (
          <span className="font-mono text-xs text-text-muted truncate" title={resStr}>
            {preview}
          </span>
        );
      },
    },
  ];

  const handleCancelRpc = async (rpc) => {
    if (rpc.status !== "QUEUED" && rpc.status !== "PENDING") {
      toast.error("Sadece QUEUED veya PENDING durumundaki RPC'ler iptal edilebilir.");
      return;
    }
    try {
      const res = await fetch(`/api/rpc?id=${rpc._id || rpc.id}&action=cancel`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success("RPC iptal edildi.");
        fetchRpcs();
      } else {
        toast.error(data.message || "İptal işlemi başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleCleanExpired = async () => {
    try {
      const res = await fetch("/api/rpc?action=cleanExpired", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(data.message || "Temizlendi.");
        fetchRpcs();
      } else {
        toast.error(data.message || "Temizleme başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
  };

  // Row actions
  const rowActions = [
    {
      label: "Detay Görüntüle",
      onClick: (rpc) => setDetailRpc(rpc),
      icon: <Eye className="h-4 w-4" />,
    },
    {
      label: "İptal Et",
      onClick: (rpc) => handleCancelRpc(rpc),
      icon: <XCircle className="h-4 w-4" />,
      className: "text-red-600",
      hidden: (rpc) => rpc.status !== "QUEUED" && rpc.status !== "PENDING",
    },
  ];

  const handlePageChange = (newPage) => {
    setPageParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      {/* Sayfa Başlığı ve Filtreler */}
      <TableHeader
        title="RPC Yönetimi"
        advert="Cihazlara RPC komutları gönderin ve geçmişi takip edin"
        addButtonName="Yeni RPC Komutu"
        onAdd={() => setOpenSend(true)}
        onRefresh={fetchRpcs}
        filterConfig={filterConfig}
        onFilterChange={setFilters}
      />

      {/* Temizleme Butonu */}
      <div className="flex justify-end px-4 -mt-2 mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCleanExpired}
          className="text-xs text-gray-500 hover:text-red-600 border-gray-200"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Süresi Dolmuşları Temizle
        </Button>
      </div>

      {/* Tablo İçeriği */}
      <TableContent
        data={rpcs}
        columns={columns}
        gridClassName="grid-cols-12"
        title="RPC Geçmişi"
        rowActions={rowActions}
        getRowId={(rpc) => rpc._id || rpc.id}
        emptyState={
          <div className="text-center py-12">
            <Zap className="h-16 w-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">
              RPC Komutu Bulunamadı
            </h3>
            <p className="text-gray-500 mt-2">
              {filters.search
                ? "Arama kriterlerinize uygun RPC komutu bulunamadı"
                : "Henüz hiç RPC komutu gönderilmemiş"}
            </p>
          </div>
        }
        pagination={{
          currentPage: pageParams.page,
          totalPages: meta.totalPages,
          itemsPerPage: pageParams.limit,
          onPageChange: handlePageChange,
        }}
      />

      {/* RPC Gönder Modalı */}
      <SendRpcModal
        open={openSend}
        onOpenChange={setOpenSend}
        onSuccess={fetchRpcs}
      />

      {/* Detay Modalı */}
      <RpcDetailModal
        open={!!detailRpc}
        onOpenChange={(open) => !open && setDetailRpc(null)}
        rpc={detailRpc}
        devicesMap={devicesMap}
      />
    </>
  );
}
