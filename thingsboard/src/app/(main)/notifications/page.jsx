"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Trash2,
  Edit,
  ToggleLeft,
  Mail,
  Globe,
  Send,
  BellOff,
  Save,
} from "lucide-react";
import {
  TableContent,
  TableHeader,
} from "@/components/common/table/table-header";
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
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

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
  { value: "all", label: "Tümü" },
  { value: "CRITICAL", label: "Kritik" },
  { value: "MAJOR", label: "Majör" },
  { value: "MINOR", label: "Minör" },
  { value: "WARNING", label: "Uyarı" },
];

const SEVERITY_COLORS = {
  CRITICAL: "bg-red-500/10 text-red-600 border-transparent",
  MAJOR: "bg-orange-500/10 text-orange-600 border-transparent",
  MINOR: "bg-yellow-500/10 text-yellow-600 border-transparent",
  WARNING: "bg-blue-500/10 text-blue-600 border-transparent",
};

function RuleEditModal({ open, onOpenChange, rule, onSuccess }) {
  const [name, setName] = useState(rule?.name || "");
  const [triggerType, setTriggerType] = useState(rule?.trigger?.type || "ALARM_CREATED");
  const [alarmType, setAlarmType] = useState(rule?.trigger?.alarmType || "");
  const [severity, setSeverity] = useState(rule?.trigger?.severity || "all");
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

  useEffect(() => {
    if (open) {
      setName(rule?.name || "");
      setTriggerType(rule?.trigger?.type || "ALARM_CREATED");
      setAlarmType(rule?.trigger?.alarmType || "");
      setSeverity(rule?.trigger?.severity || "all");
      setChannels(rule?.channels?.length ? rule.channels : [{ type: "EMAIL", enabled: true, config: { to: "" } }]);
      setSubject(rule?.template?.subject || "${deviceName} — ${alarmType} Alarmı");
      setBody(rule?.template?.body || "Cihaz: ${deviceName}\nAlarm: ${alarmType}\nSeviye: ${severity}\nDurum: ${status}\nZaman: ${timestamp}");
    }
  }, [open, rule]);

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

  const handleSave = async () => {
    if (!name.trim() || channels.length === 0) {
      toast.error("Lütfen kural adı ve en az bir kanal ekleyin.");
      return;
    }
    try {
      setSaving(true);
      const url = rule
        ? `/api/notification-rule/${rule._id}`
        : "/api/notification-rule";
      const method = rule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          trigger: { type: triggerType, alarmType, severity: severity === "all" ? "" : severity },
          channels,
          template: { subject, body },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(rule ? "Kural güncellendi." : "Kural oluşturuldu.");
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.message || "Kayıt başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-2xl p-0 overflow-hidden border-white/20 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-halo-50/50 px-6 py-5 animate-fade-in shrink-0">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-text-main">
            <div className="p-2 bg-halo-100 rounded-lg">
              {rule ? <Edit className="h-6 w-6 text-halo-600" /> : <Bell className="h-6 w-6 text-halo-600" />}
            </div>
            {rule ? "Kuralı Düzenle" : "Yeni Bildirim Kuralı"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-bold text-text-main">Kural Adı</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="örn: Kritik Alarm Bildirimi"
              className="h-12 px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">Tetikleme</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger className="h-12 w-full px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600">
                  <SelectValue placeholder="Tetikleme Tipi" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200">
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="py-2 cursor-pointer focus:bg-halo-50">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">Alarm Tipi</Label>
              <Input
                value={alarmType}
                onChange={(e) => setAlarmType(e.target.value)}
                placeholder="Boş = tümü"
                className="h-12 px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">Seviye</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-12 w-full px-4 text-base bg-white/90 border-gray-200 focus:ring-halo-600">
                  <SelectValue placeholder="Seviye" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-xl border-gray-200">
                  {SEVERITY_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="py-2 cursor-pointer focus:bg-halo-50">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-bold text-text-main">Bildirim Kanalları</Label>
              <div className="flex gap-2">
                {CHANNEL_TYPES.map((ct) => {
                  const Icon = ct.icon;
                  return (
                  <Button
                    key={ct.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addChannel(ct.value)}
                    className="h-8 text-xs border-gray-200 hover:bg-halo-50"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {ct.label} Ekle
                  </Button>
                )})}
              </div>
            </div>

            <div className="space-y-3">
              {channels.map((ch, i) => {
                const chType = CHANNEL_TYPES.find((ct) => ct.value === ch.type);
                const Icon = chType?.icon || Mail;
                return (
                  <div key={i} className="flex items-start gap-3 p-4 bg-white/60 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <Icon className="h-5 w-5 text-halo-600" />
                      <span className="text-sm font-semibold text-text-main w-20">
                        {chType?.label}
                      </span>
                    </div>

                    <div className="flex-1 space-y-2">
                      {ch.type === "EMAIL" && (
                        <Input
                          type="email"
                          value={ch.config?.to || ""}
                          onChange={(e) => updateChannel(i, "to", e.target.value)}
                          placeholder="alici@ornek.com"
                          className="h-10 text-sm bg-white border-gray-200 focus:ring-halo-600"
                        />
                      )}

                      {ch.type === "WEBHOOK" && (
                        <div className="flex gap-2">
                          <Select
                            value={ch.config?.method || "POST"}
                            onValueChange={(val) => updateChannel(i, "method", val)}
                          >
                            <SelectTrigger className="w-[100px] h-10 text-sm bg-white border-gray-200 focus:ring-halo-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              <SelectItem value="POST">POST</SelectItem>
                              <SelectItem value="PUT">PUT</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="url"
                            value={ch.config?.url || ""}
                            onChange={(e) => updateChannel(i, "url", e.target.value)}
                            placeholder="https://api.ornek.com/webhook"
                            className="flex-1 h-10 text-sm bg-white border-gray-200 focus:ring-halo-600"
                          />
                        </div>
                      )}

                      {ch.type === "TELEGRAM" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="text"
                            value={ch.config?.botToken || ""}
                            onChange={(e) => updateChannel(i, "botToken", e.target.value)}
                            placeholder="Bot Token"
                            className="h-10 text-sm bg-white border-gray-200 focus:ring-halo-600"
                          />
                          <Input
                            type="text"
                            value={ch.config?.chatId || ""}
                            onChange={(e) => updateChannel(i, "chatId", e.target.value)}
                            placeholder="Chat ID"
                            className="h-10 text-sm bg-white border-gray-200 focus:ring-halo-600"
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeChannel(i)}
                      className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-600 -mt-1 -mr-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">Konu Şablonu</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-12 px-4 text-sm bg-white/90 border-gray-200 focus:ring-halo-600 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-bold text-text-main">İçerik Şablonu</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white/90 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-halo-600 font-mono resize-none"
              />
              <p className="text-xs text-text-muted mt-1">
                Değişkenler: {"${deviceName}"}, {"${alarmType}"}, {"${severity}"}, {"${status}"}, {"${timestamp}"}, {"${details}"}
              </p>
            </div>
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
            disabled={saving}
            onClick={handleSave}
            className="h-12 px-8 text-base bg-halo-600 hover:bg-halo-700 text-white shadow-md hover:shadow-halo-600/30 transition-all flex items-center"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
            {!saving && <Save className="ml-2 h-5 w-5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function NotificationsPage() {
  const [openModal, setOpenModal] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pageParams, setPageParams] = useState({ page: 1, limit: 20 });
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ search: "" });

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", pageParams.page);
      params.append("limit", pageParams.limit);
      if (filters.search) params.append("search", filters.search);

      const res = await fetch(`/api/notification-rule?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setRules(json.data || []);
        if (json.pagination) {
          setMeta({
            total: json.pagination.total,
            totalPages: json.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      console.error("Fetch rules error:", err);
      toast.error("Kurallar alınamadı");
    } finally {
      setLoading(false);
    }
  }, [pageParams.page, pageParams.limit, filters]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleActive = async (rule) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notification-rule/${rule._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(`Kural ${!rule.enabled ? "aktif" : "deaktif"} edildi.`);
        await fetchRules();
      } else {
        toast.error(data.message || "İşlem başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (rule) => {
    const confirmed = confirm(
      `"${rule.name}" kuralını silmek istediğinizden emin misiniz?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/notification-rule/${rule._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success(`"${rule.name}" başarıyla silindi.`);
        await fetchRules();
      } else {
        toast.error(data.message || "Silme işlemi başarısız.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      id: "name",
      title: "Kural",
      span: 3,
      cellRender: (rule) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-halo-400 to-halo-600 shadow-sm text-white">
            <Bell className="h-4 w-4" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-text-main truncate">
              {rule.name}
            </p>
            <p className="text-xs text-text-muted truncate">
              {TRIGGER_TYPES.find((t) => t.value === rule.trigger?.type)?.label || rule.trigger?.type}
              {rule.trigger?.alarmType && ` • ${rule.trigger.alarmType}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "severity",
      title: "Seviye",
      span: 2,
      cellRender: (rule) => {
        if (!rule.trigger?.severity) return <span className="text-sm text-text-muted">—</span>;
        return (
          <Badge
            variant="outline"
            className={cn(
              "border-transparent font-medium",
              SEVERITY_COLORS[rule.trigger.severity] || "bg-gray-500/10 text-gray-600"
            )}
          >
            {SEVERITY_OPTIONS.find((s) => s.value === rule.trigger.severity)?.label || rule.trigger.severity}
          </Badge>
        );
      },
    },
    {
      id: "status",
      title: "Durum",
      span: 2,
      cellRender: (rule) => (
        <div className="flex items-center">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              rule.enabled ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="ml-2 text-sm text-text-main hidden xl:block">
            {rule.enabled ? "Aktif" : "Deaktif"}
          </span>
        </div>
      ),
    },
    {
      id: "channels",
      title: "Kanallar",
      span: 3,
      cellRender: (rule) => {
        const channelIcons = (rule.channels || [])
          .filter((c) => c.enabled)
          .map((c) => CHANNEL_TYPES.find((ct) => ct.value === c.type))
          .filter(Boolean);

        return (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            {channelIcons.map((ch, i) => {
              const Icon = ch.icon;
              return (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md">
                <Icon className="h-3.5 w-3.5 text-halo-600" />
                <span className="text-xs font-medium">{ch.label}</span>
              </div>
            )})}
          </div>
        );
      },
    },
  ];

  const rowActions = [
    {
      label: "Düzenle",
      onClick: (rule) => {
        setEditRule(rule);
        setOpenModal(true);
      },
      icon: <Edit className="h-4 w-4" />,
    },
    {
      label: (rule) => (rule.enabled ? "Deaktif Et" : "Aktif Et"),
      onClick: (rule) => handleToggleActive(rule),
      icon: <ToggleLeft className="h-4 w-4" />,
    },
    {
      label: "Sil",
      onClick: async (rule) => handleDeleteRule(rule),
      icon: <Trash2 className="h-4 w-4" />,
      className: "text-red-600",
    },
  ];

  const handlePageChange = (newPage) => {
    setPageParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      <TableHeader
        title="Bildirim Kuralları"
        advert="Alarm tetiklendiğinde e-posta, webhook veya Telegram üzerinden bildirim gönderilmesini yönetir"
        addButtonName="Yeni Kural Ekle"
        onAdd={() => {
          setEditRule(null);
          setOpenModal(true);
        }}
        onRefresh={fetchRules}
        filterConfig={[]}
        onFilterChange={setFilters}
      />

      <TableContent
        data={rules}
        columns={columns}
        gridClassName="grid-cols-12"
        title="Bildirim Kuralları Listesi"
        rowActions={rowActions}
        getRowId={(rule) => rule._id}
        rowClassName={(rule) => {
          if (!rule.enabled) return "opacity-60";
          return "";
        }}
        emptyState={
          <div className="text-center py-12">
            <BellOff className="h-16 w-16 mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold">
              Kural Bulunamadı
            </h3>
            <p className="text-gray-500 mt-2">
              {filters.search ? "Arama kriterlerinize uygun bildirim kuralı bulunamadı" : "Henüz hiç bildirim kuralı eklenmemiş"}
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

      <RuleEditModal
        open={openModal}
        onOpenChange={(open) => {
          setOpenModal(open);
          if (!open) setEditRule(null);
        }}
        rule={editRule}
        onSuccess={fetchRules}
      />
    </>
  );
}
