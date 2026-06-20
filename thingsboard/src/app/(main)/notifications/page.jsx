"use client";

/**
 * /notifications — Bildirim Kuralları Yönetim Sayfası
 *
 * Alarm tetiklendiğinde e-posta, webhook veya Telegram
 * üzerinden bildirim gönderilmesini yönetir.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Mail,
  Globe,
  Send,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  BellOff,
} from "lucide-react";

const TRIGGER_TYPES = [
  { value: "ALARM_CREATED", label: "Alarm Oluşturulduğunda" },
  { value: "ALARM_CLEARED", label: "Alarm Temizlendiğinde" },
  { value: "DEVICE_INACTIVE", label: "Cihaz İnaktif Olduğunda" },
];

const CHANNEL_TYPES = [
  { value: "EMAIL", label: "E-posta", icon: Mail },
  { value: "WEBHOOK", label: "Webhook", icon: Globe },
  { value: "TELEGRAM", label: "Telegram", icon: Send },
];

const SEVERITY_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "CRITICAL", label: "Kritik" },
  { value: "MAJOR", label: "Majör" },
  { value: "MINOR", label: "Minör" },
  { value: "WARNING", label: "Uyarı" },
];

const SEVERITY_COLORS = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  MAJOR: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MINOR: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  WARNING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function NotificationsPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notification-rule");
      const json = await res.json();
      if (json.ok) setRules(json.data || []);
    } catch (err) {
      console.error("Fetch rules error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggle = async (rule) => {
    try {
      await fetch(`/api/notification-rule/${rule._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      fetchRules();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleDelete = async (rule) => {
    if (!confirm(`"${rule.name}" kuralını silmek istediğinize emin misiniz?`)) return;
    try {
      await fetch(`/api/notification-rule/${rule._id}`, { method: "DELETE" });
      fetchRules();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleSave = async (data) => {
    try {
      const url = editingRule
        ? `/api/notification-rule/${editingRule._id}`
        : "/api/notification-rule";
      const method = editingRule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.ok) {
        setShowModal(false);
        setEditingRule(null);
        fetchRules();
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-main">Bildirim Kuralları</h1>
            <p className="text-sm text-text-muted">
              Alarm tetiklendiğinde e-posta, webhook veya Telegram üzerinden bildirim
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Yeni Kural
        </button>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <BellOff className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Henüz bildirim kuralı yok</p>
          <p className="text-xs mt-1">
            Yeni bir kural ekleyerek alarm tetiklendiğinde bildirim alın
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule._id}
              rule={rule}
              onToggle={() => handleToggle(rule)}
              onEdit={() => {
                setEditingRule(rule);
                setShowModal(true);
              }}
              onDelete={() => handleDelete(rule)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <RuleModal
          rule={editingRule}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}

// ── Rule Card ──
function RuleCard({ rule, onToggle, onEdit, onDelete }) {
  const triggerLabel = TRIGGER_TYPES.find((t) => t.value === rule.trigger?.type)?.label || rule.trigger?.type;
  const channelIcons = (rule.channels || [])
    .filter((c) => c.enabled)
    .map((c) => CHANNEL_TYPES.find((ct) => ct.value === c.type))
    .filter(Boolean);

  return (
    <div
      className={`bg-bg-card border rounded-xl p-4 transition-all ${
        rule.enabled
          ? "border-border hover:border-primary/30"
          : "border-border/50 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggle}
            className="shrink-0"
            title={rule.enabled ? "Devre dışı bırak" : "Etkinleştir"}
          >
            {rule.enabled ? (
              <ToggleRight className="h-6 w-6 text-green-400" />
            ) : (
              <ToggleLeft className="h-6 w-6 text-text-muted" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-main truncate">
                {rule.name}
              </span>
              {rule.trigger?.severity && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    SEVERITY_COLORS[rule.trigger.severity] || ""
                  }`}
                >
                  {rule.trigger.severity}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-text-muted">{triggerLabel}</span>
              {rule.trigger?.alarmType && (
                <span className="text-xs text-primary/70">
                  • {rule.trigger.alarmType}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Channel badges */}
          <div className="flex items-center gap-1 mr-2">
            {channelIcons.map((ch, i) => (
              <div
                key={i}
                className="p-1 bg-white/5 rounded"
                title={ch.label}
              >
                <ch.icon className="h-3.5 w-3.5 text-text-muted" />
              </div>
            ))}
          </div>

          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Düzenle"
          >
            <Edit className="h-4 w-4 text-text-muted" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Sil"
          >
            <Trash2 className="h-4 w-4 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rule Create/Edit Modal ──
function RuleModal({ rule, onSave, onClose }) {
  const [name, setName] = useState(rule?.name || "");
  const [triggerType, setTriggerType] = useState(rule?.trigger?.type || "ALARM_CREATED");
  const [alarmType, setAlarmType] = useState(rule?.trigger?.alarmType || "");
  const [severity, setSeverity] = useState(rule?.trigger?.severity || "");
  const [channels, setChannels] = useState(
    rule?.channels || [{ type: "EMAIL", enabled: true, config: { to: "" } }]
  );
  const [subject, setSubject] = useState(
    rule?.template?.subject || "${deviceName} — ${alarmType} Alarmı"
  );
  const [body, setBody] = useState(
    rule?.template?.body ||
      "Cihaz: ${deviceName}\nAlarm: ${alarmType}\nSeviye: ${severity}\nDurum: ${status}\nZaman: ${timestamp}"
  );
  const [saving, setSaving] = useState(false);

  const addChannel = (type) => {
    const defaultConfig =
      type === "EMAIL"
        ? { to: "" }
        : type === "WEBHOOK"
        ? { url: "", method: "POST" }
        : { botToken: "", chatId: "" };
    setChannels([...channels, { type, enabled: true, config: defaultConfig }]);
  };

  const updateChannel = (index, field, value) => {
    const updated = [...channels];
    if (field === "enabled") {
      updated[index].enabled = value;
    } else {
      updated[index].config = { ...updated[index].config, [field]: value };
    }
    setChannels(updated);
  };

  const removeChannel = (index) => {
    setChannels(channels.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name,
      trigger: { type: triggerType, alarmType, severity },
      channels,
      template: { subject, body },
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-10 overflow-y-auto">
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-xl shadow-2xl my-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-text-main">
            {rule ? "Kural Düzenle" : "Yeni Bildirim Kuralı"}
          </h3>
          <button type="button" onClick={onClose}>
            <X className="h-5 w-5 text-text-muted hover:text-text-main" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Kural adı */}
          <div>
            <label className="block text-sm text-text-muted mb-1">Kural Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="örn: Kritik Alarm Bildirimi"
              className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          {/* Tetikleme */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-text-muted mb-1">Tetikleme</label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-main text-sm"
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Alarm Tipi</label>
              <input
                type="text"
                value={alarmType}
                onChange={(e) => setAlarmType(e.target.value)}
                placeholder="Boş = tümü"
                className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-main text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Seviye</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-main text-sm"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Kanallar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-text-muted">Bildirim Kanalları</label>
              <div className="flex gap-1">
                {CHANNEL_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => addChannel(ct.value)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 border border-border rounded-lg transition-colors text-text-muted"
                  >
                    <ct.icon className="h-3 w-3" />
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {channels.map((ch, i) => (
                <ChannelConfigRow
                  key={i}
                  channel={ch}
                  onUpdate={(field, val) => updateChannel(i, field, val)}
                  onRemove={() => removeChannel(i)}
                />
              ))}
            </div>
          </div>

          {/* Şablon */}
          <div>
            <label className="block text-sm text-text-muted mb-1">Konu Şablonu</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-main text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">İçerik Şablonu</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-bg-surface border border-border rounded-lg text-text-main text-sm font-mono resize-none"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Değişkenler: {"${deviceName}"}, {"${alarmType}"}, {"${severity}"}, {"${status}"}, {"${timestamp}"}, {"${details}"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-muted hover:text-text-main transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={!name.trim() || channels.length === 0 || saving}
            className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {rule ? "Güncelle" : "Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Channel Config Row ──
function ChannelConfigRow({ channel, onUpdate, onRemove }) {
  const chType = CHANNEL_TYPES.find((ct) => ct.value === channel.type);
  const Icon = chType?.icon || Mail;

  return (
    <div className="flex items-start gap-2 p-3 bg-bg-surface border border-border rounded-lg">
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        <Icon className="h-4 w-4 text-text-muted" />
        <span className="text-xs font-medium text-text-muted w-16">
          {chType?.label}
        </span>
      </div>

      <div className="flex-1 space-y-1.5">
        {channel.type === "EMAIL" && (
          <input
            type="email"
            value={channel.config?.to || ""}
            onChange={(e) => onUpdate("to", e.target.value)}
            placeholder="alici@ornek.com"
            className="w-full px-2 py-1.5 bg-bg-card border border-border rounded text-text-main text-xs"
          />
        )}

        {channel.type === "WEBHOOK" && (
          <>
            <input
              type="url"
              value={channel.config?.url || ""}
              onChange={(e) => onUpdate("url", e.target.value)}
              placeholder="https://api.ornek.com/webhook"
              className="w-full px-2 py-1.5 bg-bg-card border border-border rounded text-text-main text-xs"
            />
            <select
              value={channel.config?.method || "POST"}
              onChange={(e) => onUpdate("method", e.target.value)}
              className="px-2 py-1 bg-bg-card border border-border rounded text-text-main text-xs"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </>
        )}

        {channel.type === "TELEGRAM" && (
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              value={channel.config?.botToken || ""}
              onChange={(e) => onUpdate("botToken", e.target.value)}
              placeholder="Bot Token"
              className="w-full px-2 py-1.5 bg-bg-card border border-border rounded text-text-main text-xs"
            />
            <input
              type="text"
              value={channel.config?.chatId || ""}
              onChange={(e) => onUpdate("chatId", e.target.value)}
              placeholder="Chat ID"
              className="w-full px-2 py-1.5 bg-bg-card border border-border rounded text-text-main text-xs"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="p-1 hover:bg-red-500/10 rounded transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5 text-red-400" />
      </button>
    </div>
  );
}
