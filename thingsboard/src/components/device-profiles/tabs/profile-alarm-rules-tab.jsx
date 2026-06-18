"use client";

/**
 * ProfileAlarmRulesTab — Profil alarm kurallarını gösteren sekme
 *
 * profile.alarms dizisindeki her kuralı kart olarak görüntüler.
 * Salt-okunur tab — düzenleme profil edit formunda yapılır.
 */

import { AlertTriangle, ShieldAlert, Bell, BellOff } from "lucide-react";

// --- Severity renk haritası ---
const SEVERITY_CONFIG = {
  CRITICAL: {
    label: "Kritik",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    cardBorder: "border-red-200",
    iconColor: "text-red-500",
  },
  MAJOR: {
    label: "Yüksek",
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    cardBorder: "border-orange-200",
    iconColor: "text-orange-500",
  },
  MINOR: {
    label: "Düşük",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    cardBorder: "border-yellow-200",
    iconColor: "text-yellow-600",
  },
  WARNING: {
    label: "Uyarı",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    cardBorder: "border-amber-200",
    iconColor: "text-amber-500",
  },
  INDETERMINATE: {
    label: "Belirsiz",
    badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
    cardBorder: "border-gray-200",
    iconColor: "text-gray-500",
  },
};

const DEFAULT_SEVERITY = {
  label: "Bilinmiyor",
  badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
  cardBorder: "border-gray-200",
  iconColor: "text-gray-400",
};

export function ProfileAlarmRulesTab({ profile }) {
  const alarms = profile?.alarms || [];

  // --- Boş durum ---
  if (alarms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 mb-4">
          <BellOff className="h-10 w-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-text-main mb-2">
          Alarm Kuralı Bulunmuyor
        </h3>
        <p className="text-sm text-text-muted max-w-sm">
          Bu profil için henüz alarm kuralı tanımlanmamış. Profili düzenleyerek
          alarm kuralları ekleyebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- Başlık --- */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Bu profile ait {alarms.length} alarm kuralı tanımlı
        </p>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-halo-50 text-halo-700 border border-halo-200 text-xs font-medium">
          <Bell className="w-3 h-3 mr-1" />
          {alarms.length} kural
        </span>
      </div>

      {/* --- Alarm Kartları --- */}
      <div className="space-y-3">
        {alarms.map((alarm, index) => {
          const severity =
            SEVERITY_CONFIG[alarm.severity] || DEFAULT_SEVERITY;

          return (
            <div
              key={alarm._id || index}
              className={`rounded-xl border bg-white/40 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow ${severity.cardBorder}`}
            >
              {/* Üst: Alarm tipi + severity badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm border ${severity.cardBorder}`}
                  >
                    <ShieldAlert
                      className={`h-5 w-5 ${severity.iconColor}`}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text-main">
                      {alarm.alarmType || `Alarm #${index + 1}`}
                    </h4>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${severity.badgeClass}`}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {severity.label}
                </span>
              </div>

              {/* --- Oluşturma Koşulu --- */}
              <div className="space-y-2 mb-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Oluşturma Koşulu
                </p>
                <div className="bg-gray-100 font-mono rounded-lg px-3 py-2.5 text-sm text-gray-800 border border-gray-200">
                  {alarm.createCondition || "Koşul tanımlanmamış"}
                </div>
              </div>

              {/* --- Temizleme Koşulu --- */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Temizleme Koşulu
                </p>
                {alarm.clearCondition ? (
                  <div className="bg-gray-100 font-mono rounded-lg px-3 py-2.5 text-sm text-gray-800 border border-gray-200">
                    {alarm.clearCondition}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic pl-1">
                    Temizleme koşulu tanımlanmamış
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
