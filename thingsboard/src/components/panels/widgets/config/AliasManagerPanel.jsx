"use client";

/**
 * AliasManagerPanel — Pano Seviyesi Alias Yönetim Paneli
 *
 * Dashboard toolbar'dan açılır.
 * Tüm alias'ları listeler, oluşturma/düzenleme/silme sağlar.
 * Alias silmeden önce hangi widget'ların kullandığını gösterir.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactSelect from "react-select";
import {
  X, Plus, Pencil, Trash2, Check, AlertTriangle,
  Link2, Cpu, Server, Layers, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

/* ── Alias tip ikonları ve etiketleri ── */
const ALIAS_TYPE_INFO = {
  SINGLE_DEVICE:           { label: "Tek Cihaz",              icon: Cpu },
  DEVICE_LIST:             { label: "Cihaz Listesi",          icon: Layers },
  ASSET_CHILDREN:          { label: "Asset Alt Cihazları",    icon: Server },
  DEVICE_PROFILE:          { label: "Cihaz Profili",          icon: Cpu },
  ASSET_CHILDREN_BY_PROFILE: { label: "Asset + Profil",      icon: Layers },
};

/* ── ReactSelect ortak stiller ── */
const selectStyles = {
  control: (base) => ({
    ...base, minHeight: 34, fontSize: "13px",
    backgroundColor: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.4)",
    boxShadow: "none", "&:hover": { borderColor: "rgba(99,102,241,0.5)" },
  }),
  menu: (base) => ({
    ...base, zIndex: 50, background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.4)",
  }),
  option: (base, state) => ({
    ...base, fontSize: "12px", padding: "6px 10px",
    background: state.isFocused ? "rgba(99,102,241,0.08)" : "transparent",
    color: state.isSelected ? "#6366f1" : "#334155",
  }),
};

export default function AliasManagerPanel({
  aliases = [],
  widgets = [],
  devices = [],
  onAliasChange,
  onClose,
}) {
  const [editingId, setEditingId] = useState(null); // hangi alias düzenleniyor
  const [formData, setFormData] = useState(null);    // edit/create form state
  const [creating, setCreating] = useState(false);   // yeni alias oluşturma modu
  const [previewDevices, setPreviewDevices] = useState([]); // çözümlenmiş cihaz listesi
  const [assets, setAssets] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // silme onayı için aliasId
  const [expandedId, setExpandedId] = useState(null);

  // Assets ve Profiles çek
  useEffect(() => {
    fetch("/api/asset?limit=100").then(r => r.json())
      .then(d => d.ok ? setAssets(d.data || []) : null).catch(() => {});
    fetch("/api/device-profile?limit=100").then(r => r.json())
      .then(d => d.ok ? setProfiles(d.data || []) : null).catch(() => {});
  }, []);

  // Alias preview çözümleme
  useEffect(() => {
    if (!formData?.type) { setPreviewDevices([]); return; }
    const aliasToResolve = {
      id: "__preview__",
      aliasName: formData.aliasName || "preview",
      type: formData.type,
      config: formData.config || {},
    };
    fetch("/api/alias/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aliases: [aliasToResolve] }),
    })
      .then(r => r.json())
      .then(d => setPreviewDevices(d.ok ? (d.resolved?.["__preview__"] || []) : []))
      .catch(() => setPreviewDevices([]));
  }, [formData?.type, formData?.config]);

  // Hangi widget'lar bu alias'ı kullanıyor
  const getWidgetsUsingAlias = useCallback((aliasId) => {
    return widgets.filter(w => w.aliasId === aliasId);
  }, [widgets]);

  // Device options
  const deviceOptions = useMemo(() =>
    devices.map(d => ({ value: d._id, label: d.name || d._id })),
    [devices]
  );
  const assetOptions = useMemo(() =>
    assets.map(a => ({ value: a._id, label: a.name })),
    [assets]
  );
  const profileOptions = useMemo(() =>
    profiles.map(p => ({ value: p._id, label: p.name })),
    [profiles]
  );

  // ── Yeni alias oluştur ──
  const handleStartCreate = () => {
    setCreating(true);
    setEditingId(null);
    setFormData({ aliasName: "", type: "", config: {} });
    setPreviewDevices([]);
  };

  // ── Mevcut alias düzenle ──
  const handleStartEdit = (alias) => {
    setCreating(false);
    setEditingId(alias.id);
    setFormData({
      aliasName: alias.aliasName,
      type: alias.type,
      config: { ...alias.config },
    });
  };

  // ── Kaydet (create veya update) ──
  const handleSave = () => {
    if (!formData?.aliasName?.trim()) {
      toast.error("Alias adı zorunludur."); return;
    }
    if (!formData?.type) {
      toast.error("Alias tipi seçilmelidir."); return;
    }

    let updated;
    if (creating) {
      const newAlias = {
        id: crypto.randomUUID(),
        aliasName: formData.aliasName.trim(),
        type: formData.type,
        config: formData.config || {},
      };
      updated = [...aliases, newAlias];
      toast.success(`"${newAlias.aliasName}" alias oluşturuldu.`);
    } else {
      updated = aliases.map(a =>
        a.id === editingId
          ? { ...a, aliasName: formData.aliasName.trim(), type: formData.type, config: formData.config || {} }
          : a
      );
      toast.success(`"${formData.aliasName}" güncellendi.`);
    }

    onAliasChange(updated);
    setFormData(null);
    setEditingId(null);
    setCreating(false);
    setPreviewDevices([]);
  };

  // ── Alias sil ──
  const handleDelete = (aliasId) => {
    const usedBy = getWidgetsUsingAlias(aliasId);
    if (usedBy.length > 0) {
      setDeleteConfirm(aliasId);
      return;
    }
    doDelete(aliasId);
  };

  const doDelete = (aliasId) => {
    const alias = aliases.find(a => a.id === aliasId);
    const updated = aliases.filter(a => a.id !== aliasId);
    onAliasChange(updated);
    setDeleteConfirm(null);
    if (editingId === aliasId) {
      setEditingId(null);
      setFormData(null);
    }
    toast.success(`"${alias?.aliasName}" silindi.`);
  };

  // ── İptal ──
  const handleCancel = () => {
    setFormData(null);
    setEditingId(null);
    setCreating(false);
    setPreviewDevices([]);
  };

  // ── Config alt alanları renderla ──
  const renderConfigFields = () => {
    if (!formData?.type) return null;

    switch (formData.type) {
      case "SINGLE_DEVICE":
        return (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-text-muted">Cihaz</Label>
            <ReactSelect
              options={deviceOptions}
              value={deviceOptions.find(o => o.value === formData.config?.deviceId) || null}
              onChange={(opt) => setFormData(p => ({ ...p, config: { ...p.config, deviceId: opt?.value || null } }))}
              placeholder="Cihaz seçin..."
              styles={selectStyles}
            />
          </div>
        );

      case "DEVICE_LIST":
        return (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-text-muted">Cihazlar</Label>
            <ReactSelect
              isMulti
              options={deviceOptions}
              value={deviceOptions.filter(o => (formData.config?.deviceIds || []).includes(o.value))}
              onChange={(sel) => setFormData(p => ({ ...p, config: { ...p.config, deviceIds: sel?.map(s => s.value) || [] } }))}
              placeholder="Cihazları seçin..."
              styles={selectStyles}
            />
          </div>
        );

      case "ASSET_CHILDREN":
        return (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-text-muted">Asset</Label>
            <ReactSelect
              options={assetOptions}
              value={assetOptions.find(o => o.value === formData.config?.assetId) || null}
              onChange={(opt) => setFormData(p => ({ ...p, config: { ...p.config, assetId: opt?.value || null } }))}
              placeholder="Asset seçin..."
              styles={selectStyles}
            />
          </div>
        );

      case "DEVICE_PROFILE":
        return (
          <div className="space-y-1">
            <Label className="text-xs font-medium text-text-muted">Cihaz Profili</Label>
            <ReactSelect
              options={profileOptions}
              value={profileOptions.find(o => o.value === formData.config?.deviceProfileId) || null}
              onChange={(opt) => setFormData(p => ({ ...p, config: { ...p.config, deviceProfileId: opt?.value || null } }))}
              placeholder="Profil seçin..."
              styles={selectStyles}
            />
          </div>
        );

      case "ASSET_CHILDREN_BY_PROFILE":
        return (
          <>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-text-muted">Asset</Label>
              <ReactSelect
                options={assetOptions}
                value={assetOptions.find(o => o.value === formData.config?.assetId) || null}
                onChange={(opt) => setFormData(p => ({ ...p, config: { ...p.config, assetId: opt?.value || null } }))}
                placeholder="Asset seçin..."
                styles={selectStyles}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-text-muted">Cihaz Profili</Label>
              <ReactSelect
                options={profileOptions}
                value={profileOptions.find(o => o.value === formData.config?.deviceProfileId) || null}
                onChange={(opt) => setFormData(p => ({ ...p, config: { ...p.config, deviceProfileId: opt?.value || null } }))}
                placeholder="Profil seçin..."
                styles={selectStyles}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] z-50 bg-white/95 backdrop-blur-xl border-l border-gray-200 shadow-2xl flex flex-col"
    >
      {/* ── Başlık ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-halo-600" />
          <h2 className="text-base font-bold text-text-main">Alias Yönetimi</h2>
          <span className="bg-halo-100 text-halo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {aliases.length}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── İçerik ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Mevcut Alias Listesi */}
        {aliases.length === 0 && !creating && (
          <div className="text-center py-10 text-text-muted">
            <Link2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">Henüz alias yok</p>
            <p className="text-xs mt-1">Widget'larınızı dinamik veri kaynaklarına bağlamak için alias oluşturun.</p>
          </div>
        )}

        {aliases.map((alias) => {
          const typeInfo = ALIAS_TYPE_INFO[alias.type] || { label: alias.type, icon: Link2 };
          const TypeIcon = typeInfo.icon;
          const usedBy = getWidgetsUsingAlias(alias.id);
          const isEditing = editingId === alias.id;
          const isExpanded = expandedId === alias.id;

          return (
            <div
              key={alias.id}
              className={`rounded-xl border transition-all ${
                isEditing
                  ? "border-halo-400 bg-halo-50/30 shadow-md"
                  : "border-gray-200 bg-white/60 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              {/* Alias kartı başlık */}
              <div className="flex items-center gap-3 p-3">
                <div className={`p-2 rounded-lg ${isEditing ? "bg-halo-100 text-halo-600" : "bg-gray-100 text-gray-500"}`}>
                  <TypeIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-main truncate">{alias.aliasName}</p>
                  <p className="text-[10px] text-text-muted">{typeInfo.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  {usedBy.length > 0 && (
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {usedBy.length} widget
                    </span>
                  )}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : alias.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleStartEdit(alias)}
                    className="p-1 text-gray-400 hover:text-halo-600 rounded transition-colors"
                    title="Düzenle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(alias.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Genişletilmiş detay — kullanan widget'lar */}
              <AnimatePresence>
                {isExpanded && !isEditing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-1">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Kullanan Widget&apos;lar</p>
                      {usedBy.length === 0 ? (
                        <p className="text-xs text-text-muted italic">Hiçbir widget bu alias&apos;ı kullanmıyor</p>
                      ) : (
                        usedBy.map(w => (
                          <div key={w.i} className="flex items-center gap-2 text-xs text-text-main py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-halo-400" />
                            <span>{w.title || w.type}</span>
                            <span className="text-text-muted">({w.type})</span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Silme onay dialogu */}
              <AnimatePresence>
                {deleteConfirm === alias.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-3 mb-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-red-700">
                            Bu alias {usedBy.length} widget tarafından kullanılıyor!
                          </p>
                          <p className="text-[10px] text-red-600 mt-0.5">
                            Silinirse bu widget&apos;lar veri kaynağını kaybedecek.
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => doDelete(alias.id)}
                              className="text-[10px] font-medium px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Yine de Sil
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-[10px] font-medium px-2.5 py-1 rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            >
                              İptal
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* ── Düzenleme / Oluşturma Formu ── */}
        <AnimatePresence>
          {formData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-xl border-2 border-halo-400 bg-white/80 backdrop-blur p-4 space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-halo-700">
                  {creating ? "Yeni Alias Oluştur" : "Alias Düzenle"}
                </h4>
                <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Alias adı */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-text-muted">Alias Adı</Label>
                <Input
                  value={formData.aliasName}
                  onChange={(e) => setFormData(p => ({ ...p, aliasName: e.target.value }))}
                  placeholder="ör. Sera Sıcaklık Sensörleri"
                  className="h-8 text-sm bg-white/70 border-gray-200"
                />
              </div>

              {/* Alias tipi */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-text-muted">Alias Tipi</Label>
                <Select
                  value={formData.type || ""}
                  onValueChange={(v) => setFormData(p => ({ ...p, type: v, config: {} }))}
                >
                  <SelectTrigger className="h-8 text-sm bg-white/70 border-gray-200">
                    <SelectValue placeholder="Tip seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ALIAS_TYPE_INFO).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tip bazlı alt alanlar */}
              {renderConfigFields()}

              {/* Çözümlenen cihazlar preview */}
              {previewDevices.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-muted">
                    Çözümlenen Cihazlar ({previewDevices.length})
                  </Label>
                  <div className="space-y-0.5 max-h-28 overflow-y-auto bg-green-50/50 rounded-lg p-2">
                    {previewDevices.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-xs text-text-main">
                        <Check className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="font-medium">{d.name}</span>
                        {d.profileName && <span className="text-text-muted text-[10px]">({d.profileName})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aksiyon butonları */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="flex-1 bg-halo-600 hover:bg-halo-700 text-white text-xs h-8"
                >
                  <Check className="h-3 w-3 mr-1" />
                  {creating ? "Oluştur" : "Güncelle"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 text-xs h-8"
                >
                  İptal
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Alt buton ── */}
      <div className="shrink-0 p-4 border-t border-gray-100">
        {!formData && (
          <Button
            onClick={handleStartCreate}
            className="w-full bg-halo-600 hover:bg-halo-700 text-white text-sm h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Yeni Alias Oluştur
          </Button>
        )}
      </div>
    </motion.div>
  );
}
