"use client";

/**
 * /alarmlar — Alarm Listesi
 */

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bell, CheckCircle, XCircle, AlertTriangle,
  AlertOctagon, Info, RotateCw, Filter,
} from "lucide-react";
import toast from "react-hot-toast";

const SEVERITY_CONFIG = {
  CRITICAL: { color: "bg-red-100 text-red-700 border-red-200", icon: AlertOctagon, label: "Kritik" },
  MAJOR: { color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle, label: "Önemli" },
  MINOR: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Info, label: "Düşük" },
};

const STATUS_CONFIG = {
  ACTIVE: { color: "bg-red-50 border-red-200 text-red-700", label: "Aktif", dot: "bg-red-500" },
  ACKNOWLEDGED: { color: "bg-blue-50 border-blue-200 text-blue-700", label: "Onaylandı", dot: "bg-blue-500" },
  CLEARED: { color: "bg-green-50 border-green-200 text-green-700", label: "Temizlendi", dot: "bg-green-500" },
};

export default function AlarmlarPage() {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [activeCount, setActiveCount] = useState(0);

  const fetchAlarms = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (severityFilter && severityFilter !== "all") params.append("severity", severityFilter);
      params.append("limit", "100");

      const res = await fetch(`/api/alarm?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setAlarms(data.data);
        setActiveCount(data.activeCount);
      }
    } catch (err) {
      toast.error("Alarmlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  const handleAction = async (alarmId, action) => {
    try {
      const res = await fetch("/api/alarm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarmId, action }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message);
        fetchAlarms();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient flex items-center gap-3">
            <Bell className="h-7 w-7" />
            Alarmlar
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Cihaz profillerindeki kurallar ihlal edildiğinde alarm oluşur
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <Badge className="bg-red-500 text-white px-3 py-1 text-sm">
              {activeCount} Aktif Alarm
            </Badge>
          )}
          <Button
            onClick={fetchAlarms}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="glass p-4 flex items-center gap-4 flex-wrap">
        <Filter className="h-4 w-4 text-text-muted" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9 bg-white/90 border-gray-200 text-black">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Onaylanmış</SelectItem>
            <SelectItem value="CLEARED">Temizlenmiş</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px] h-9 bg-white/90 border-gray-200 text-black">
            <SelectValue placeholder="Önem" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">Tüm Seviyeler</SelectItem>
            <SelectItem value="CRITICAL">Kritik</SelectItem>
            <SelectItem value="MAJOR">Önemli</SelectItem>
            <SelectItem value="MINOR">Düşük</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alarm Listesi */}
      {loading ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-halo-600 mx-auto" />
        </div>
      ) : alarms.length === 0 ? (
        <div className="glass rounded-xl text-center py-16">
          <CheckCircle className="h-16 w-16 mx-auto text-green-300 mb-4" />
          <h3 className="text-lg font-semibold text-text-main">Alarm bulunmuyor</h3>
          <p className="text-sm text-text-muted mt-2">
            Tüm sistemler normal çalışıyor
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alarms.map((alarm) => {
            const sev = SEVERITY_CONFIG[alarm.severity] || SEVERITY_CONFIG.MINOR;
            const stat = STATUS_CONFIG[alarm.status] || STATUS_CONFIG.ACTIVE;
            const SevIcon = sev.icon;

            return (
              <div
                key={alarm._id}
                className={`glass rounded-xl p-4 flex items-center justify-between gap-4 transition-all hover:shadow-md ${
                  alarm.status === "ACTIVE" ? "border-l-4 border-l-red-500" : ""
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Severity Icon */}
                  <div className={`p-2 rounded-lg ${sev.color}`}>
                    <SevIcon className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-text-main">{alarm.type}</span>
                      <Badge variant="outline" className={sev.color}>
                        {sev.label}
                      </Badge>
                      <Badge variant="outline" className={stat.color}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stat.dot} mr-1.5`} />
                        {stat.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span>📱 {alarm.deviceName || "Bilinmeyen"}</span>
                      <span>📊 {alarm.details?.key}: {alarm.details?.triggerValue?.toFixed(1)}</span>
                      <span>⏰ {new Date(alarm.createdAt).toLocaleString("tr-TR")}</span>
                    </div>
                  </div>
                </div>

                {/* Aksiyonlar */}
                {alarm.status === "ACTIVE" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(alarm._id, "acknowledge")}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(alarm._id, "clear")}
                      className="text-green-600 border-green-200 hover:bg-green-50 gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Temizle
                    </Button>
                  </div>
                )}
                {alarm.status === "ACKNOWLEDGED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(alarm._id, "clear")}
                    className="text-green-600 border-green-200 hover:bg-green-50 gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Temizle
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
