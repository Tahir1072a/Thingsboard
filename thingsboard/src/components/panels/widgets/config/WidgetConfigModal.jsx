"use client";

/**
 * WidgetConfigModal — Widget Ekleme/Düzenleme Modalı (ThingsBoard Stili)
 *
 * Sol: Veri kaynağı + ayarlar (Basic/Advanced tab)
 * Sağ: Canlı ön izleme
 *
 * Props:
 * - open: boolean
 * - mode: "add" | "edit"
 * - widget: müze widget objesi (edit modda)
 * - devices: cihaz listesi [{_id, name}]
 * - onSave: (widgetObj) => void
 * - onClose: () => void
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ReactSelect from "react-select";
import {
  X, Plus, ChevronRight, Settings2, Eye, Palette,
  BarChart3, Gauge, LayoutGrid, Table2, MapPin, Zap, Bell, Hash,
  Map, PieChart, Power, SlidersHorizontal, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { WIDGET_TYPES } from "@/components/panels/WidgetRenderer";
import { WIDGET_SCHEMAS, WIDGET_CATEGORIES, getDefaultConfig, getDatasourceConstraints } from "./WidgetSchemas";
import WidgetPreviewer from "./WidgetPreviewer";
import { getGroupedUnitOptions, getUnitSymbol } from "@/lib/units";

// Kategori ikonu eşleştirme
const CATEGORY_ICONS = {
  charts: BarChart3,
  gauges: Gauge,
  cards: LayoutGrid,
  tables: Table2,
  maps: MapPin,
  control: Zap,
  alarms: Bell,
};

export default function WidgetConfigModal({
  open,
  mode = "add",
  widget = null,
  devices = [],
  onSave,
  onClose,
}) {
  // Form state
  const [step, setStep] = useState(mode === "edit" ? "configure" : "select"); // "select" | "configure"
  const [selectedType, setSelectedType] = useState("");
  const [title, setTitle] = useState("");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [config, setConfig] = useState({});
  const [activeTab, setActiveTab] = useState("basic"); // "basic" | "advanced"
  const [availableKeys, setAvailableKeys] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  // Edit mode: widget verilerini yükle
  useEffect(() => {
    if (open && mode === "edit" && widget) {
      setSelectedType(widget.type);
      setTitle(widget.title || "");
      setSelectedDeviceIds(widget.devices?.map(d => d.id) || []);
      setSelectedKeys(widget.keys || []);
      setConfig(widget.config || {});
      setStep("configure");
      setActiveTab("basic");
    } else if (open && mode === "add") {
      setSelectedType("");
      setTitle("");
      setSelectedDeviceIds([]);
      setSelectedKeys([]);
      setConfig({});
      setStep("select");
      setActiveTab("basic");
      setActiveCategory(null);
    }
  }, [open, mode, widget]);

  // Telemetri key'lerini çek (cihaz seçildiğinde)
  useEffect(() => {
    if (selectedDeviceIds.length === 0) {
      setAvailableKeys([]);
      return;
    }
    const fetchKeys = async () => {
      try {
        const deviceId = selectedDeviceIds[0];
        const res = await fetch(`/api/telemetry/keys?deviceId=${deviceId}`);
        const data = await res.json();
        if (data.ok) {
          setAvailableKeys(data.keys || []);
        }
      } catch {
        setAvailableKeys([]);
      }
    };
    fetchKeys();
  }, [selectedDeviceIds]);

  // Attribute auto-fill (cihaz seçildiğinde)
  useEffect(() => {
    if (selectedDeviceIds.length !== 1 || !selectedType) return;
    const schema = WIDGET_SCHEMAS[selectedType];
    if (!schema) return;

    const needsMinMax = schema.basicFields.some(f => f.key === "min" || f.key === "max");
    if (!needsMinMax) return;

    const fetchAttributes = async () => {
      try {
        const res = await fetch(`/api/device/${selectedDeviceIds[0]}/attributes?scope=SERVER_SCOPE`);
        const data = await res.json();
        if (data.ok && data.attributes) {
          const attrs = {};
          data.attributes.forEach(a => { attrs[a.key] = a.value; });
          if (attrs.min !== undefined || attrs.max !== undefined || attrs.warning_threshold !== undefined) {
            setConfig(prev => ({
              ...prev,
              ...(attrs.min !== undefined && { min: Number(attrs.min) }),
              ...(attrs.max !== undefined && { max: Number(attrs.max) }),
              ...(attrs.warning_threshold !== undefined && { warningThreshold: Number(attrs.warning_threshold) }),
            }));
          }
        }
      } catch { /* ignore */ }
    };
    fetchAttributes();
  }, [selectedDeviceIds, selectedType]);

  // Widget tipi seçildiğinde default config yükle
  const handleSelectType = (type) => {
    setSelectedType(type);
    const defaultConfig = getDefaultConfig(type);
    setConfig(defaultConfig);
    const wt = WIDGET_TYPES.find(w => w.type === type);
    setTitle(wt?.label || "");
    setStep("configure");
  };

  // Config alanı değiştirme
  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Kaydet
  const handleSave = () => {
    if (!selectedType) {
      toast.error("Widget tipi seçilmedi.");
      return;
    }
    if (!title.trim()) {
      toast.error("Başlık zorunludur.");
      return;
    }

    const constraints = getDatasourceConstraints(selectedType);

    if (constraints.requireDevice && selectedDeviceIds.length === 0) {
      toast.error("En az bir cihaz seçmelisiniz.");
      return;
    }
    if (constraints.requireKey && selectedKeys.length === 0) {
      toast.error("En az bir telemetri verisi seçmelisiniz.");
      return;
    }
    if (constraints.maxDevices && selectedDeviceIds.length > constraints.maxDevices) {
      toast.error(`Bu widget için maksimum ${constraints.maxDevices} cihaz seçilebilir.`);
      return;
    }
    if (constraints.maxKeys && selectedKeys.length > constraints.maxKeys) {
      toast.error(`Bu widget için maksimum ${constraints.maxKeys} veri seçilebilir.`);
      return;
    }

    const selectedDevices = selectedDeviceIds.map(id => {
      const d = devices.find(x => x._id === id);
      return { id: d?._id, name: d?.name || "" };
    }).filter(d => d.id);

    const typeConfig = WIDGET_TYPES.find(t => t.type === selectedType);

    const widgetObj = {
      i: mode === "edit" && widget ? widget.i : `w-${Date.now()}`,
      type: selectedType,
      devices: selectedDevices,
      keys: selectedKeys,
      title: title.trim(),
      config,
      ...(mode === "add" ? {
        x: 0,
        y: 99999, // react-grid-layout otomatik compact eder
        w: typeConfig?.defaultSize?.w || 4,
        h: typeConfig?.defaultSize?.h || 3,
      } : {}),
    };

    onSave(widgetObj);
  };

  // Cihaz seçeneği
  const deviceOptions = useMemo(() =>
    devices.map(d => ({ value: d._id, label: d.name || d._id })),
    [devices]
  );

  // Key seçeneği
  const keyOptions = useMemo(() =>
    availableKeys.map(k => ({ value: k, label: k })),
    [availableKeys]
  );

  // Preview device objelerini oluştur
  const previewDevices = useMemo(() =>
    selectedDeviceIds.map(id => {
      const d = devices.find(x => x._id === id);
      return { id: d?._id || id, name: d?.name || "Cihaz" };
    }),
    [selectedDeviceIds, devices]
  );

  // Schema bilgisi
  const schema = WIDGET_SCHEMAS[selectedType];
  const selectedTypeInfo = WIDGET_TYPES.find(w => w.type === selectedType);

  // Filtrelenmiş widget listesi (kategori seçimine göre)
  const filteredWidgets = useMemo(() => {
    if (!activeCategory) return WIDGET_TYPES;
    return WIDGET_TYPES.filter(w => {
      const s = WIDGET_SCHEMAS[w.type];
      return s?.category === activeCategory;
    });
  }, [activeCategory]);

  // ------- FORM FIELD RENDERER -------
  const renderField = (field) => {
    const value = config[field.key] !== undefined ? config[field.key] : field.defaultValue;

    switch (field.type) {
      case "text":
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-text-muted">{field.label}</Label>
            <Input
              value={value || ""}
              onChange={(e) => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder || ""}
              className="h-9 text-sm glass-strong border-white/40"
            />
          </div>
        );

      case "number":
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-text-muted">{field.label}</Label>
            <Input
              type="number"
              value={value ?? ""}
              onChange={(e) => handleConfigChange(field.key, e.target.value === "" ? null : Number(e.target.value))}
              min={field.min}
              max={field.max}
              step={field.step || 1}
              placeholder={field.placeholder || ""}
              className="h-9 text-sm glass-strong border-white/40"
            />
          </div>
        );

      case "select":
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-text-muted">{field.label}</Label>
            <Select value={value || ""} onValueChange={(v) => handleConfigChange(field.key, v)}>
              <SelectTrigger className="h-9 text-sm glass-strong border-white/40">
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {field.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "toggle":
        return (
          <div key={field.key} className="flex items-center justify-between py-2">
            <Label className="text-xs font-medium text-text-muted">{field.label}</Label>
            <button
              type="button"
              onClick={() => handleConfigChange(field.key, !value)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                value ? "bg-halo-600" : "bg-gray-300"
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                value ? "translate-x-5" : ""
              )} />
            </button>
          </div>
        );

      case "color":
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-text-muted">{field.label}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value || "#6366f1"}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                className="h-9 w-12 rounded-lg border border-white/40 cursor-pointer"
              />
              <Input
                value={value || ""}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                className="h-9 text-sm glass-strong border-white/40 flex-1 font-mono"
                placeholder="#hex"
              />
            </div>
          </div>
        );

      case "colorRanges":
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-xs font-medium text-text-muted">{field.label}</Label>
            {(value || []).map((range, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  type="number"
                  value={range.from}
                  onChange={(e) => {
                    const newRanges = [...(value || [])];
                    newRanges[idx] = { ...newRanges[idx], from: Number(e.target.value) };
                    handleConfigChange(field.key, newRanges);
                  }}
                  className="h-8 w-16 text-xs glass-strong border-white/40"
                  placeholder="Min"
                />
                <span className="text-xs text-text-muted">→</span>
                <Input
                  type="number"
                  value={range.to}
                  onChange={(e) => {
                    const newRanges = [...(value || [])];
                    newRanges[idx] = { ...newRanges[idx], to: Number(e.target.value) };
                    handleConfigChange(field.key, newRanges);
                  }}
                  className="h-8 w-16 text-xs glass-strong border-white/40"
                  placeholder="Max"
                />
                <input
                  type="color"
                  value={range.color}
                  onChange={(e) => {
                    const newRanges = [...(value || [])];
                    newRanges[idx] = { ...newRanges[idx], color: e.target.value };
                    handleConfigChange(field.key, newRanges);
                  }}
                  className="h-8 w-8 rounded cursor-pointer border border-white/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newRanges = (value || []).filter((_, i) => i !== idx);
                    handleConfigChange(field.key, newRanges);
                  }}
                  className="h-8 w-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newRanges = [...(value || []), { from: 0, to: 100, color: "#6366f1" }];
                handleConfigChange(field.key, newRanges);
              }}
              className="text-xs text-halo-600 hover:text-halo-700 font-medium flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Aralık Ekle
            </button>
          </div>
        );

      case "unit_select": {
        const groupedOptions = getGroupedUnitOptions();
        const selectedOption = groupedOptions
          .flatMap((g) => g.options)
          .find((o) => o.value === value) || null;

        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-text-muted">{field.label}</Label>
            <ReactSelect
              value={selectedOption}
              onChange={(opt) => handleConfigChange(field.key, opt?.value || "")}
              options={groupedOptions}
              isClearable
              placeholder="Birim seçin..."
              noOptionsMessage={() => "Birim bulunamadı"}
              formatGroupLabel={(group) => (
                <div className="text-xs font-semibold text-halo-600 py-1 border-b border-gray-100">
                  {group.label}
                </div>
              )}
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: "36px",
                  fontSize: "14px",
                  background: "rgba(255,255,255,0.6)",
                  borderColor: "rgba(255,255,255,0.4)",
                  boxShadow: "none",
                  "&:hover": { borderColor: "rgba(99,102,241,0.5)" },
                }),
                menu: (base) => ({
                  ...base,
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.4)",
                  zIndex: 50,
                }),
                option: (base, state) => ({
                  ...base,
                  fontSize: "13px",
                  padding: "6px 12px",
                  background: state.isFocused ? "rgba(99,102,241,0.08)" : "transparent",
                  color: state.isSelected ? "#6366f1" : "#334155",
                  fontWeight: state.isSelected ? 600 : 400,
                }),
                groupHeading: (base) => ({
                  ...base,
                  padding: "4px 12px",
                  margin: 0,
                }),
              }}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent 
        className="!max-w-[1100px] w-[95vw] h-[85vh] p-0 overflow-hidden glass-strong border-white/20 flex flex-col"
        style={{ maxWidth: '1100px' }}
      >
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-text-main flex items-center gap-2">
              {step === "select" ? (
                <>
                  <Plus className="h-5 w-5 text-halo-600" />
                  Widget Ekle
                </>
              ) : (
                <>
                  <Settings2 className="h-5 w-5 text-halo-600" />
                  {mode === "edit" ? "Widget Düzenle" : "Widget Yapılandır"}: {selectedTypeInfo?.label}
                </>
              )}
            </DialogTitle>
            {step === "configure" && mode === "add" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("select")}
                className="text-xs text-text-muted"
              >
                ← Tür Değiştir
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {step === "select" ? (
            /* ===== WIDGET TİPİ SEÇİMİ ===== */
            <div className="h-full flex flex-col p-6 overflow-y-auto">
              {/* Kategori filtreleri */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    !activeCategory
                      ? "bg-halo-600 text-white shadow-md"
                      : "bg-white/60 text-text-muted hover:bg-white/80"
                  )}
                >
                  Tümü
                </button>
                {WIDGET_CATEGORIES.map(cat => {
                  const Icon = CATEGORY_ICONS[cat.id];
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                        activeCategory === cat.id
                          ? "bg-halo-600 text-white shadow-md"
                          : "bg-white/60 text-text-muted hover:bg-white/80"
                      )}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Widget kartları */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start">
                {filteredWidgets.map(wt => {
                  const Icon = wt.icon;
                  return (
                    <button
                      key={wt.type}
                      onClick={() => handleSelectType(wt.type)}
                      className={cn(
                        "group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        "bg-white/40 border-white/20",
                        "hover:border-halo-400 hover:bg-halo-50/50 hover:shadow-lg",
                        "active:scale-[0.98]"
                      )}
                    >
                      <div className="p-3 rounded-xl bg-halo-50/80 text-halo-600 group-hover:bg-halo-100 transition-colors">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-text-main">{wt.label}</span>
                      <span className="text-[11px] text-text-muted text-center leading-tight">{wt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ===== YAPILANDIRMA EKRANI ===== */
            <div className="h-full flex flex-col lg:flex-row">
              {/* Sol: Ayarlar */}
              <div className="lg:w-[45%] border-r border-white/10 overflow-y-auto p-6 space-y-5">
                {/* Veri Kaynağı */}
                {schema?.datasource?.requireDevice && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <Settings2 className="h-3.5 w-3.5" /> Veri Kaynağı
                    </h4>

                    {/* Cihaz seçimi */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-text-muted">Cihaz</Label>
                      <ReactSelect
                        isMulti={!schema.datasource.maxDevices || schema.datasource.maxDevices > 1}
                        options={deviceOptions}
                        value={deviceOptions.filter(o => selectedDeviceIds.includes(o.value))}
                        onChange={(selected) => {
                          const ids = Array.isArray(selected)
                            ? selected.map(s => s.value)
                            : selected ? [selected.value] : [];
                          setSelectedDeviceIds(ids);
                        }}
                        placeholder="Cihaz seçin..."
                        className="text-sm"
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: 36,
                            backgroundColor: "rgba(255,255,255,0.6)",
                            borderColor: "rgba(255,255,255,0.4)",
                          }),
                          menu: (base) => ({ ...base, zIndex: 50 }),
                        }}
                      />
                    </div>

                    {/* Key seçimi */}
                    {schema.datasource.requireKey && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-text-muted">Telemetri Verisi</Label>
                        <ReactSelect
                          isMulti={!schema.datasource.maxKeys || schema.datasource.maxKeys > 1}
                          options={keyOptions}
                          value={keyOptions.filter(o => selectedKeys.includes(o.value))}
                          onChange={(selected) => {
                            const keys = Array.isArray(selected)
                              ? selected.map(s => s.value)
                              : selected ? [selected.value] : [];
                            setSelectedKeys(keys);
                          }}
                          placeholder={availableKeys.length === 0 ? "Önce cihaz seçin" : "Veri seçin..."}
                          isDisabled={availableKeys.length === 0}
                          className="text-sm"
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: 36,
                              backgroundColor: "rgba(255,255,255,0.6)",
                              borderColor: "rgba(255,255,255,0.4)",
                            }),
                            menu: (base) => ({ ...base, zIndex: 50 }),
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Başlık */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-text-muted">Widget Başlığı</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Widget başlığı..."
                    className="h-9 text-sm glass-strong border-white/40"
                  />
                </div>

                {/* Basic / Advanced Tabs */}
                {schema && (schema.basicFields.length > 0 || schema.advancedFields.length > 0) && (
                  <div className="space-y-3">
                    <div className="flex gap-1 bg-white/30 p-1 rounded-lg">
                      <button
                        onClick={() => setActiveTab("basic")}
                        className={cn(
                          "flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all",
                          activeTab === "basic"
                            ? "bg-white shadow-sm text-halo-700"
                            : "text-text-muted hover:text-text-main"
                        )}
                      >
                        <Palette className="h-3 w-3 inline mr-1" />
                        Temel
                      </button>
                      {schema.advancedFields.length > 0 && (
                        <button
                          onClick={() => setActiveTab("advanced")}
                          className={cn(
                            "flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all",
                            activeTab === "advanced"
                              ? "bg-white shadow-sm text-halo-700"
                              : "text-text-muted hover:text-text-main"
                          )}
                        >
                          <Settings2 className="h-3 w-3 inline mr-1" />
                          Gelişmiş
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {(activeTab === "basic" ? schema.basicFields : schema.advancedFields).map(renderField)}
                    </div>
                  </div>
                )}
              </div>

              {/* Sağ: Ön İzleme */}
              <div className="lg:w-[55%] p-6 bg-gray-50/20">
                <WidgetPreviewer
                  widgetType={selectedType}
                  config={config}
                  devices={previewDevices}
                  keys={selectedKeys}
                  title={title}
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {step === "configure" && (
          <DialogFooter className="px-6 py-4 border-t border-white/10 shrink-0 flex flex-row justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-10 px-5 border-gray-300 text-gray-600 bg-white hover:bg-gray-100"
            >
              İptal
            </Button>
            <Button
              onClick={handleSave}
              className="h-10 px-6 bg-halo-600 hover:bg-halo-700 text-white"
            >
              {mode === "edit" ? "Güncelle" : "Widget Ekle"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
