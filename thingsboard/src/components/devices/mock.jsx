"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Download,
  History,
  Activity,
  AlertTriangle,
  Users,
  Link2,
} from "lucide-react";

// --- 1. ÖZNİTELİKLER ---
export function DeviceAttributesTab() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-main">Öznitelikler</h3>
        <Button
          size="sm"
          className="bg-halo-600 hover:bg-halo-700 text-white cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-1" /> Yeni Ekle
        </Button>
      </div>
      <div className="space-y-3">
        <AttributeCard
          type="Sunucu Taraflı"
          name="active"
          value="true"
          color="blue"
        />
        <AttributeCard
          type="Sunucu Taraflı"
          name="lastConnectTime"
          value="1698754321000"
          color="blue"
        />
        <AttributeCard
          type="Paylaşılan"
          name="firmwareVersion"
          value="v2.0.4"
          color="orange"
        />
        <AttributeCard
          type="Cihaz Taraflı"
          name="temperature"
          value="24.5"
          color="green"
        />
      </div>
    </div>
  );
}

// --- 2. TELEMETRİ ---
export function DeviceTelemetryTab() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-main">Son Telemetri</h3>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/40 border-white/60 cursor-pointer"
        >
          <Download className="h-4 w-4 mr-2" /> Dışa Aktar
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TelemetryCard name="Sıcaklık" value="22.5 °C" time="2 dk önce" />
        <TelemetryCard name="Nem" value="%45" time="2 dk önce" />
        <TelemetryCard name="Batarya" value="%88" time="5 dk önce" />
        <TelemetryCard name="Sinyal Gücü" value="-65 dBm" time="1 dk önce" />
      </div>
    </div>
  );
}

// --- 3. ALARMLAR ---
export function DeviceAlarmsTab() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-main">Alarm Geçmişi</h3>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/40 border-white/60 cursor-pointer"
        >
          <History className="h-4 w-4 mr-2" /> Filtrele
        </Button>
      </div>
      <div className="space-y-3">
        <AlarmCard
          severity="critical"
          message="Yüksek Sıcaklık Uyarısı"
          time="10 dk önce"
        />
        <AlarmCard
          severity="warning"
          message="Bağlantı Gecikmesi"
          time="2 saat önce"
        />
        <AlarmCard
          severity="info"
          message="Yazılım Güncellendi"
          time="1 gün önce"
        />
      </div>
    </div>
  );
}

// --- YARDIMCI KART BİLEŞENLERİ (Sadece bu dosya içinde kullanılır) ---
function AttributeCard({ type, name, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return (
    <div className="glass p-4 rounded-xl flex items-center justify-between border border-white/40 hover:bg-white/60 transition-colors">
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={`${colors[color] || colors.blue} border bg-opacity-50`}
        >
          {type}
        </Badge>
        <code className="text-sm font-mono text-text-main font-medium">
          {name}
        </code>
      </div>
      <span className="text-sm text-text-muted">{value}</span>
    </div>
  );
}

function TelemetryCard({ name, value, time }) {
  return (
    <div className="glass p-4 rounded-xl border border-white/40 hover:bg-white/60 transition-all cursor-pointer group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-text-muted">{name}</p>
          <h4 className="text-2xl font-bold text-halo-700 mt-1 group-hover:text-halo-900">
            {value}
          </h4>
        </div>
        <Activity className="h-5 w-5 text-halo-300 group-hover:text-halo-500 transition-colors" />
      </div>
      <p className="text-xs text-text-light mt-3">{time}</p>
    </div>
  );
}

function AlarmCard({ severity, message, time }) {
  const styles = {
    critical: {
      bg: "bg-red-100",
      icon: "text-red-600",
      border: "border-red-200",
    },
    warning: {
      bg: "bg-orange-100",
      icon: "text-orange-600",
      border: "border-orange-200",
    },
    info: {
      bg: "bg-blue-100",
      icon: "text-blue-600",
      border: "border-blue-200",
    },
  };
  const style = styles[severity] || styles.info;

  return (
    <div
      className={`glass p-4 rounded-xl flex items-start gap-4 border hover:bg-white/60 transition-colors ${style.border}`}
    >
      <div className={`p-2 rounded-lg ${style.bg}`}>
        <AlertTriangle className={`h-5 w-5 ${style.icon}`} />
      </div>
      <div className="flex-1">
        <p className="text-base font-medium text-text-main leading-tight">
          {message}
        </p>
        <p className="text-xs text-text-muted mt-1">{time}</p>
      </div>
    </div>
  );
}
