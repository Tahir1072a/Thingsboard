"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, AlertTriangle, Bell, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: "Kritik",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: ShieldAlert,
    iconColor: "text-red-600",
  },
  MAJOR: {
    label: "Yüksek",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    icon: AlertTriangle,
    iconColor: "text-orange-600",
  },
  MINOR: {
    label: "Düşük",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    icon: Bell,
    iconColor: "text-yellow-600",
  },
  WARNING: {
    label: "Uyarı",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Info,
    iconColor: "text-blue-600",
  },
};

const STATUS_CONFIG = {
  ACTIVE: { label: "Aktif", color: "bg-red-500/10 text-red-600 border-red-200" },
  ACKNOWLEDGED: { label: "Onaylandı", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  CLEARED: { label: "Temizlendi", color: "bg-green-500/10 text-green-600 border-green-200" },
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function AlarmDetailModal({ open, onOpenChange, alarm }) {
  if (!alarm) return null;

  const sev = SEVERITY_CONFIG[alarm.severity] || SEVERITY_CONFIG.MINOR;
  const SevIcon = sev.icon;
  const sts = STATUS_CONFIG[alarm.status] || STATUS_CONFIG.ACTIVE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white/95 backdrop-blur-xl border-white/40 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white shadow-sm border ${sev.color}`}>
              <SevIcon className={`h-6 w-6 ${sev.iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-800">
                {alarm.type}
              </DialogTitle>
              <p className="text-sm text-slate-500 font-medium">
                Cihaz: {alarm.deviceName}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Status & Severity */}
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Durum</p>
              <Badge variant="outline" className={sts.color}>{sts.label}</Badge>
            </div>
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Kritiklik</p>
              <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
            </div>

            {/* Timing */}
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Başlangıç Zamanı</p>
              <p className="text-sm font-medium text-slate-700">{formatDate(alarm.startTime || alarm.createdAt)}</p>
            </div>
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Temizlenme Zamanı</p>
              <p className="text-sm font-medium text-slate-700">{alarm.status === "CLEARED" ? formatDate(alarm.clearedAt) : "Devam Ediyor"}</p>
            </div>
          </div>

          {/* Details */}
          {alarm.details && (
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tetiklenme Detayları</p>
              <div className="space-y-2">
                {alarm.details.key && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Anahtar (Key):</span>
                    <span className="font-mono font-medium text-slate-800">{alarm.details.key}</span>
                  </div>
                )}
                {alarm.details.triggerValue !== undefined && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tetikleyen Değer:</span>
                    <span className="font-mono font-medium text-red-600">{alarm.details.triggerValue}</span>
                  </div>
                )}
                {alarm.details.threshold && (
                  <div className="flex flex-col gap-1 text-sm mt-2 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Koşul:</span>
                    <code className="bg-white px-2 py-1.5 rounded-md text-xs border border-slate-200 text-slate-700 shadow-sm overflow-x-auto whitespace-nowrap">
                      {alarm.details.threshold}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Duration */}
          <div className="text-center pt-2">
            <span className="text-xs text-slate-500">
              Aktif Kalma Süresi: <strong className="text-slate-700">{alarm.duration || "Bilinmiyor"}</strong>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
