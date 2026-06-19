"use client";

/**
 * ProfileAlarmRulesTab — Profil alarm kurallarını düzenleme sekmesi
 *
 * profile.alarms dizisindeki kuralları düzenlenebilir kartlar olarak gösterir.
 * Kural ekleme, düzenleme ve silme işlemlerini destekler.
 * Kaydet butonu ile PUT /api/device-profile/{id} endpoint'ine gönderir.
 */

import { useState, useCallback } from "react";
import {
  ShieldAlert,
  Bell,
  BellOff,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

// --- Severity yapılandırması ---
const SEVERITY_OPTIONS = [
  { value: "CRITICAL", label: "Kritik" },
  { value: "MAJOR", label: "Yüksek" },
  { value: "MINOR", label: "Düşük" },
  { value: "WARNING", label: "Uyarı" },
];

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
};

const DEFAULT_SEVERITY = {
  label: "Bilinmiyor",
  badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
  cardBorder: "border-gray-200",
  iconColor: "text-gray-400",
};

// --- Boş kural şablonu ---
const createEmptyRule = () => ({
  _tempId: crypto.randomUUID(),
  alarmType: "",
  severity: "WARNING",
  createCondition: "",
  clearCondition: "",
});

export function ProfileAlarmRulesTab({ profile, onProfileUpdated }) {
  const [rules, setRules] = useState(() =>
    (profile?.alarms || []).map((alarm) => ({
      ...alarm,
      _tempId: alarm._id || crypto.randomUUID(),
    }))
  );
  const [saving, setSaving] = useState(false);

  // --- Kural ekleme ---
  const handleAddRule = useCallback(() => {
    setRules((prev) => [createEmptyRule(), ...prev]);
  }, []);

  // --- Kural silme ---
  const handleDeleteRule = useCallback((tempId) => {
    setRules((prev) => prev.filter((r) => r._tempId !== tempId));
  }, []);

  // --- Kural alanı güncelleme ---
  const handleFieldChange = useCallback((tempId, field, value) => {
    setRules((prev) =>
      prev.map((r) => (r._tempId === tempId ? { ...r, [field]: value } : r))
    );
  }, []);

  // --- Kaydetme ---
  const handleSave = async () => {
    // Validasyon: her kuralda en az alarmType ve createCondition olmalı
    const invalidRules = rules.filter(
      (r) => !r.alarmType.trim() || !r.createCondition.trim()
    );
    if (invalidRules.length > 0) {
      toast.error(
        "Her kural için alarm tipi ve oluşturma koşulu zorunludur."
      );
      return;
    }

    setSaving(true);
    try {
      const alarmsPayload = rules.map(
        ({ alarmType, severity, createCondition, clearCondition }) => ({
          alarmType: alarmType.trim(),
          severity,
          createCondition: createCondition.trim(),
          clearCondition: clearCondition?.trim() || "",
        })
      );

      const response = await fetch(`/api/device-profile/${profile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarms: alarmsPayload }),
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        toast.success("Alarm kuralları başarıyla kaydedildi.");
        if (onProfileUpdated) {
          onProfileUpdated(result.data);
        }
      } else {
        toast.error(result.message || "Kaydetme işlemi başarısız.");
      }
    } catch (error) {
      console.error("Alarm kuralları kaydetme hatası:", error);
      toast.error("Sunucuya bağlanırken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  // --- Boş durum ---
  if (rules.length === 0) {
    return (
      <div className="space-y-4">
        {/* Kural Ekle butonu */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddRule}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-halo-600 to-halo-700 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Kural Ekle
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <BellOff className="h-10 w-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-text-main mb-2">
            Alarm Kuralı Bulunmuyor
          </h3>
          <p className="text-sm text-text-muted max-w-sm">
            Bu profil için henüz alarm kuralı tanımlanmamış. Yukarıdaki butonu
            kullanarak yeni alarm kuralları ekleyebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* --- Üst Bar: Bilgi + Butonlar --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-halo-50 text-halo-700 border border-halo-200 text-xs font-medium">
            <Bell className="w-3 h-3 mr-1" />
            {rules.length} kural
          </span>
          <p className="text-xs text-muted-foreground">
            Bu profile ait {rules.length} alarm kuralı tanımlı
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddRule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-halo-200 bg-halo-50 text-halo-700 text-xs font-medium hover:bg-halo-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Kural Ekle
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-halo-600 to-halo-700 text-white text-xs font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* --- Alarm Kartları --- */}
      <div className="space-y-3">
        {rules.map((rule, index) => {
          const severity =
            SEVERITY_CONFIG[rule.severity] || DEFAULT_SEVERITY;

          return (
            <div
              key={rule._tempId}
              className={`group rounded-xl border bg-white/40 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow ${severity.cardBorder}`}
            >
              {/* --- Üst Satır: Icon + Alarm Tipi + Severity + Sil --- */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border ${severity.cardBorder}`}
                  >
                    <ShieldAlert
                      className={`h-5 w-5 ${severity.iconColor}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={rule.alarmType}
                      onChange={(e) =>
                        handleFieldChange(
                          rule._tempId,
                          "alarmType",
                          e.target.value
                        )
                      }
                      placeholder="Örn: Yüksek Sıcaklık"
                      className="w-full h-9 text-sm bg-white/70 border border-gray-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-halo-500/20 focus:border-halo-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  {/* Severity seçimi */}
                  <select
                    value={rule.severity}
                    onChange={(e) =>
                      handleFieldChange(
                        rule._tempId,
                        "severity",
                        e.target.value
                      )
                    }
                    className={`h-9 text-xs font-semibold rounded-lg border px-2.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-halo-500/20 ${severity.badgeClass}`}
                  >
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Sil butonu — hover'da görünür */}
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule._tempId)}
                    className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer"
                    title="Kuralı sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* --- Oluşturma Koşulu --- */}
              <div className="space-y-1.5 mb-3">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Oluşturma Koşulu
                </p>
                <input
                  type="text"
                  value={rule.createCondition}
                  onChange={(e) =>
                    handleFieldChange(
                      rule._tempId,
                      "createCondition",
                      e.target.value
                    )
                  }
                  placeholder="Örn: temperature > 50"
                  className="w-full h-9 text-sm font-mono bg-white/70 border border-gray-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-halo-500/20 focus:border-halo-400 transition-colors"
                />
              </div>

              {/* --- Temizleme Koşulu --- */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Temizleme Koşulu
                  <span className="ml-1.5 text-[10px] font-normal text-gray-400 normal-case">
                    (opsiyonel)
                  </span>
                </p>
                <input
                  type="text"
                  value={rule.clearCondition}
                  onChange={(e) =>
                    handleFieldChange(
                      rule._tempId,
                      "clearCondition",
                      e.target.value
                    )
                  }
                  placeholder="Örn: temperature < 45"
                  className="w-full h-9 text-sm font-mono bg-white/70 border border-gray-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-halo-500/20 focus:border-halo-400 transition-colors"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Alt Kaydet Butonu --- */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-halo-600 to-halo-700 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
