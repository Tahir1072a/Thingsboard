"use client";

/**
 * /panolar/[id] — Pano Düzenleyici & Görüntüleyici
 *
 * react-grid-layout ile sürükle-bırak widget düzenleme.
 * SSE ile canlı veri akışı.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ResponsiveGridLayout, useContainerWidth } from "react-grid-layout";
import WidgetRenderer, { WIDGET_TYPES } from "@/components/panels/WidgetRenderer";
import ReactSelect from "react-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Save, ArrowLeft, Plus, X,
  LayoutDashboard, Pencil, Check,
  Share2, Link, Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import Breadcrumbs from "@/components/common/breadcrumbs";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

export default function DashboardEditorPage() {
  const { id } = useParams();
  const router = useRouter();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  // Paylaşım state'leri
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState({ isPublic: false, publicToken: null, publicUrl: null });
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(null); // 'url' | 'embed' | null

  // Container width ölçümü (react-grid-layout v2 hook)
  const { width: containerWidth, containerRef } = useContainerWidth({ initialWidth: 1200 });

  // Widget ekleme drawer
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [availableKeys, setAvailableKeys] = useState([]);
  const [addForm, setAddForm] = useState({
    type: "",
    deviceIds: [],
    keys: [],
    title: "",
    min: 0,
    max: 100,
    rpcMethod: "",
    rpcParamKey: "value",
    rpcStep: 1,
    rpcUnit: "%",
    rpcButtonLabel: "",
    rpcButtonColor: "purple",
    warningThreshold: null,
  });

  // ------------------------------------------------------------------ //
  // Veri çekme
  // ------------------------------------------------------------------ //
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/${id}`);
      const data = await res.json();
      if (data.ok) {
        setDashboard(data.data);
        setTempName(data.data.name);
        // Paylaşım durumunu yükle
        if (data.data.isPublic && data.data.publicToken) {
          setShareData({
            isPublic: true,
            publicToken: data.data.publicToken,
            publicUrl: `${window.location.origin}/d/${data.data.publicToken}`,
          });
        }
      } else {
        toast.error(data.message || "Pano bulunamadı.");
        router.push("/panolar");
      }
    } catch {
      toast.error("Sunucu hatası.");
      router.push("/panolar");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/device?limit=100");
      const data = await res.json();
      if (data.ok) setDevices(data.data);
    } catch { }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchDevices();
  }, [fetchDashboard, fetchDevices]);

  // Seçilen cihazlara göre telemetri key'lerini dinamik getir
  useEffect(() => {
    if (addForm.deviceIds.length === 0) {
      setAvailableKeys([]);
      setAddForm((p) => ({ ...p, keys: [] }));
      return;
    }

    const fetchKeys = async () => {
      try {
        const promises = addForm.deviceIds.map(id => fetch(`/api/telemetry/keys?deviceId=${id}`).then(r => r.json()));
        const results = await Promise.all(promises);

        let allKeys = new Set();
        results.forEach(data => {
          if (data.ok && data.keys) {
            data.keys.forEach(k => allKeys.add(k));
          }
        });

        const keysArr = Array.from(allKeys);
        setAvailableKeys(keysArr);
        // Eğer seçili type 'table' veya yeni ekleniyorsa, keys'i varsayılan olarak güncelle.
        // Tekli seçim gerektiren durumlarda sadece 1 key kalsın.
        setAddForm((p) => {
          const isSingleKey = p.type === "value_card" || p.type === "gauge" || p.type === "line_chart";
          let newKeys = keysArr;
          if (isSingleKey && keysArr.length > 0) newKeys = [keysArr[0]];
          return { ...p, keys: newKeys };
        });
      } catch {
        setAvailableKeys([]);
      }
    };

    fetchKeys();
  }, [addForm.deviceIds, addForm.type]);

  // Cihaz seçildiğinde attribute'ları çekip autofill
  const fetchDeviceAttributes = useCallback(async (deviceId) => {
    try {
      const res = await fetch(`/api/device/${deviceId}/attributes?scope=SERVER_SCOPE`);
      const data = await res.json();
      if (data.ok && data.data) {
        const attrs = {};
        data.data.forEach(a => { attrs[a.key] = a.value; });
        setAddForm(p => {
          const updates = {};
          if (attrs.max_limit != null) updates.max = Number(attrs.max_limit);
          if (attrs.min_limit != null) updates.min = Number(attrs.min_limit);
          if (attrs.warning_threshold != null) updates.warningThreshold = Number(attrs.warning_threshold);
          return { ...p, ...updates };
        });
      }
    } catch { }
  }, []);

  // ------------------------------------------------------------------ //
  // Layout değişikliği
  // ------------------------------------------------------------------ //
  const handleLayoutChange = useCallback((currentLayout) => {
    if (!dashboard || !editMode) return;

    setDashboard((prev) => {
      const updatedWidgets = prev.widgets.map((w) => {
        const layoutItem = currentLayout.find((l) => l.i === w.i);
        if (layoutItem) {
          return { ...w, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
        }
        return w;
      });
      return { ...prev, widgets: updatedWidgets };
    });
  }, [editMode, dashboard]);

  // ------------------------------------------------------------------ //
  // Kaydetme
  // ------------------------------------------------------------------ //
  const handleSave = async () => {
    if (!dashboard) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/dashboard/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dashboard.name,
          description: dashboard.description,
          widgets: dashboard.widgets,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Pano kaydedildi!");
        setEditMode(false);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Kaydetme hatası.");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------ //
  // İsim düzenleme
  // ------------------------------------------------------------------ //
  const handleNameSave = () => {
    if (!tempName.trim()) {
      toast.error("Pano adı boş olamaz.");
      return;
    }
    setDashboard((prev) => ({ ...prev, name: tempName }));
    setEditingName(false);
  };

  // ------------------------------------------------------------------ //
  // Paylaşım işlemleri
  // ------------------------------------------------------------------ //
  const handleEnableShare = async () => {
    try {
      setShareLoading(true);
      const res = await fetch(`/api/dashboard/${id}/share`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setShareData({ isPublic: true, publicToken: data.publicToken, publicUrl: data.publicUrl });
        toast.success("Paylaşım açıldı!");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Paylaşım açılamadı.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleDisableShare = async () => {
    try {
      setShareLoading(true);
      const res = await fetch(`/api/dashboard/${id}/share`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setShareData({ isPublic: false, publicToken: null, publicUrl: null });
        toast.success("Paylaşım kapatıldı.");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Paylaşım kapatılamadı.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // ------------------------------------------------------------------ //
  // Widget ekleme
  // ------------------------------------------------------------------ //
  const handleAddWidget = () => {
    if (!addForm.type || !addForm.title) {
      toast.error("Tip ve başlık zorunludur.");
      return;
    }

    // image_map için cihaz/key zorunlu değil — sonradan marker ile eklenir
    const isImageMap = addForm.type === "image_map";
    const isRpcWidget = addForm.type?.startsWith("rpc_");

    if (!isImageMap && !isRpcWidget) {
      if (addForm.deviceIds.length === 0) {
        toast.error("En az bir cihaz seçmelisiniz.");
        return;
      }
      if (addForm.keys.length === 0) {
        toast.error("En az bir telemetri verisi seçmelisiniz.");
        return;
      }
    }

    // Doğrulamalar
    if (addForm.type === "value_card" || addForm.type === "gauge") {
      if (addForm.deviceIds.length > 1) {
        toast.error("Değer Kartı ve Gösterge için sadece 1 cihaz seçebilirsiniz.");
        return;
      }
      if (addForm.keys.length > 1) {
        toast.error("Değer Kartı ve Gösterge için sadece 1 veri (key) seçebilirsiniz.");
        return;
      }
    }

    if (addForm.type === "line_chart") {
      if (addForm.keys.length > 1) {
        toast.error("Çizgi Grafikte birden fazla sensör karşılaştırmak için sadece 1 veri (key) seçmelisiniz.");
        return;
      }
    }

    const typeConfig = WIDGET_TYPES.find((t) => t.type === addForm.type);

    // deviceIds dizisindeki ID'lerden obje oluştur {id, name}
    const selectedDevices = addForm.deviceIds.map(id => {
      const d = devices.find(x => x._id === id);
      return { id: d?._id, name: d?.name };
    }).filter(d => d.id);

    // Widget config — tip bazlı
    let widgetConfig = {};
    if (addForm.type === "gauge") {
      widgetConfig = { min: addForm.min, max: addForm.max };
    } else if (isImageMap) {
      widgetConfig = { imageSrc: "", markers: [] };
    } else if (addForm.type === "line_chart" && addForm.warningThreshold != null) {
      widgetConfig = { warningThreshold: addForm.warningThreshold };
    } else if (addForm.type === "rpc_switch") {
      widgetConfig = {
        method: addForm.rpcMethod || "setValue",
        paramKey: addForm.rpcParamKey || "value",
        onValue: true,
        offValue: false
      };
    } else if (addForm.type === "rpc_slider") {
      widgetConfig = {
        method: addForm.rpcMethod || "setValue",
        paramKey: addForm.rpcParamKey || "value",
        min: addForm.min,
        max: addForm.max,
        step: addForm.rpcStep || 1,
        unit: addForm.rpcUnit || "%"
      };
    } else if (addForm.type === "rpc_button") {
      widgetConfig = {
        method: addForm.rpcMethod || "execute",
        params: {},
        buttonLabel: addForm.rpcButtonLabel || addForm.title,
        buttonColor: addForm.rpcButtonColor || "purple",
        timeout: 10000
      };
    }

    const newWidget = {
      i: `w-${Date.now()}`,
      type: addForm.type,
      devices: (isImageMap) ? [] : selectedDevices,
      keys: (isImageMap || isRpcWidget) ? [] : addForm.keys,
      title: addForm.title,
      config: widgetConfig,
      x: 0,
      y: Infinity, // en alta ekle
      w: typeConfig?.defaultSize?.w || 4,
      h: typeConfig?.defaultSize?.h || 3,
    };

    setDashboard((prev) => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));

    setAddForm({ type: "", deviceIds: [], keys: [], title: "", min: 0, max: 100, rpcMethod: "", rpcParamKey: "value", rpcStep: 1, rpcUnit: "%", rpcButtonLabel: "", rpcButtonColor: "purple", warningThreshold: null });
    setAddDrawerOpen(false);
    toast.success("Widget eklendi! Kaydetmeyi unutmayın.");
  };

  // ------------------------------------------------------------------ //
  // Widget silme
  // ------------------------------------------------------------------ //
  const handleRemoveWidget = (widgetId) => {
    setDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.i !== widgetId),
    }));
    toast.success("Widget kaldırıldı.");
  };

  // ------------------------------------------------------------------ //
  // Render
  // ------------------------------------------------------------------ //
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-halo-600" />
      </div>
    );
  }

  if (!dashboard) return null;

  const layoutData = dashboard.widgets.map((w) => ({
    i: w.i,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: 2,
    minH: 2,
    static: !editMode,
  }));

  return (
    <div className="space-y-4 p-1 min-h-[calc(100vh-4rem)] bg-slate-50/50 -mx-4 -my-4 px-4 py-4 rounded-xl">
      {!editMode && (
        <Breadcrumbs items={[
          { label: "Panolar", href: "/panolar" },
          { label: dashboard?.name || "Pano Detayı" },
        ]} />
      )}

      {/* ── Üst Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/panolar")}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="h-9 w-64 text-lg font-bold bg-white/90 text-black"
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleNameSave} className="h-8 w-8">
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingName(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-halo-600" />
              <h1 className="text-xl font-bold text-text-main">{dashboard.name}</h1>
              {editMode && (
                <button onClick={() => setEditingName(true)} className="text-text-muted hover:text-text-main">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDrawerOpen(true)}
                className="border-halo-300 text-halo-700 bg-halo-50 hover:bg-halo-100"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Widget Ekle
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-halo-600 hover:bg-halo-700 text-white"
              >
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
            className="border-gray-300 text-gray-600 hover:text-halo-600 hover:border-halo-300"
          >
            <Share2 className="mr-1.5 h-4 w-4" />
            Paylaş
          </Button>
          <Button
            variant={editMode ? "outline" : "default"}
            size="sm"
            onClick={() => setEditMode((prev) => !prev)}
            className={editMode ? "border-gray-300" : "bg-halo-600 hover:bg-halo-700 text-white"}
          >
            {editMode ? "Düzenlemeyi Bitir" : "Düzenle"}
          </Button>
        </div>
      </div>

      {/* ── Grid Layout ── */}
      {dashboard.widgets.length === 0 ? (
        <div className="glass rounded-xl text-center py-20">
          <LayoutDashboard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-text-main">Bu pano boş</h3>
          <p className="text-sm text-text-muted mt-2 mb-6">
            İlk widget'ınızı eklemek için düzenleme moduna geçin.
          </p>
          {!editMode && (
            <Button
              onClick={() => setEditMode(true)}
              className="bg-halo-600 text-white"
            >
              Düzenlemeye Başla
            </Button>
          )}
        </div>
      ) : (
        <div ref={containerRef}>
          <ResponsiveGridLayout
            className="layout"
            width={containerWidth}
            layouts={{ lg: layoutData }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={80}
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".widget-drag-handle"
            compactType="vertical"
            margin={[12, 12]}
          >
            {dashboard.widgets.map((widget) => (
              <div key={widget.i}>
                <WidgetRenderer
                  widget={widget}
                  isEditMode={editMode}
                  onDelete={() => handleRemoveWidget(widget.i)}
                  onWidgetConfigChange={(newConfig) => {
                    setDashboard((prev) => ({
                      ...prev,
                      widgets: prev.widgets.map((w) =>
                        w.i === widget.i ? { ...w, config: { ...w.config, ...newConfig } } : w
                      ),
                    }));
                  }}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      )}

      {/* ── Widget Ekleme Drawer/Overlay ── */}
      {addDrawerOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-end">
          <div
            className="w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Plus className="h-5 w-5 text-halo-600" />
                Widget Ekle
              </h2>
              <button
                onClick={() => setAddDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-6">
              {/* 1. Widget Tipi Seçimi */}
              <div className="space-y-3">
                <Label className="font-bold text-sm">1. Widget Tipi</Label>
                <div className="grid grid-cols-2 gap-2">
                  {WIDGET_TYPES.map((wt) => {
                    const Icon = wt.icon;
                    const isSelected = addForm.type === wt.type;
                    return (
                      <button
                        key={wt.type}
                        type="button"
                        onClick={() => setAddForm((p) => ({ ...p, type: wt.type }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isSelected
                          ? "border-halo-500 bg-halo-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                      >
                        <Icon className={`h-6 w-6 ${isSelected ? "text-halo-600" : "text-gray-500"}`} />
                        <span className={`text-xs font-semibold ${isSelected ? "text-halo-700" : "text-gray-700"}`}>
                          {wt.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{wt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Cihaz Seçimi (image_map hariç) */}
              {addForm.type !== "image_map" && (
                <div className="space-y-2">
                  <Label className="font-bold text-sm">2. Cihaz(lar)</Label>
                  <ReactSelect
                    isMulti
                    options={devices.map(d => ({ label: d.name, value: d._id }))}
                    value={devices.filter(d => addForm.deviceIds.includes(d._id)).map(d => ({ label: d.name, value: d._id }))}
                    onChange={(selectedOptions) => {
                      const selectedValues = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                      const isSingleDevice = addForm.type === "value_card" || addForm.type === "gauge";
                      if (isSingleDevice && selectedValues.length > 1) {
                        setTimeout(() => toast.error("Bu widget tipi için sadece 1 cihaz seçebilirsiniz."), 0);
                        return;
                      }
                      setAddForm(p => ({ ...p, deviceIds: selectedValues }));
                      // Autofill: ilk cihazın attribute'larını çek
                      if (selectedValues.length > 0) {
                        fetchDeviceAttributes(selectedValues[0]);
                      }
                    }}
                    placeholder="Cihaz seçin..."
                    noOptionsMessage={() => "Sistemde cihaz bulunamadı."}
                    className="text-sm"
                    styles={{
                      control: (baseStyles) => ({
                        ...baseStyles,
                        minHeight: '48px',
                        borderRadius: '0.375rem',
                        borderColor: '#e5e7eb',
                      }),
                    }}
                  />
                  <p className="text-[11px] text-gray-400">
                    Birden fazla sensörden gelen veriyi kıyaslamak için birden fazla cihaz seçebilirsiniz (Grafik ve Tablo).
                  </p>
                </div>
              )}

              {/* 3. Telemetri Key'leri (image_map hariç) */}
              {addForm.type !== "image_map" && (
                <div className="space-y-2">
                  <Label className="font-bold text-sm">3. Telemetri Key&apos;leri</Label>
                  {addForm.deviceIds.length === 0 ? (
                    <div className="h-[48px] bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-gray-400">
                      Önce cihaz seçmelisiniz...
                    </div>
                  ) : (
                    <ReactSelect
                      isMulti
                      options={availableKeys.map(k => ({ label: k, value: k }))}
                      value={addForm.keys.map(k => ({ label: k, value: k }))}
                      onChange={(selectedOptions) => {
                        const selectedValues = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                        const isSingleKey = addForm.type === "value_card" || addForm.type === "gauge" || addForm.type === "line_chart";
                        if (isSingleKey && selectedValues.length > 1) {
                          setTimeout(() => toast.error("Bu widget tipi için sadece 1 veri (key) seçebilirsiniz."), 0);
                          return;
                        }
                        setAddForm(p => ({ ...p, keys: selectedValues }));
                      }}
                      placeholder="Gösterilecek verileri seçin..."
                      noOptionsMessage={() => "Cihaz(lar)da henüz veri yok."}
                      className="text-sm"
                      styles={{
                        control: (baseStyles) => ({
                          ...baseStyles,
                          minHeight: '48px',
                          borderRadius: '0.375rem',
                          borderColor: '#e5e7eb',
                        }),
                      }}
                    />
                  )}
                  <p className="text-[11px] text-gray-400">
                    Grafik, Değer Kartı ve Gösterge için 1 veri (key) seçilmelidir. Tablo için birden fazla seçilebilir.
                  </p>
                </div>
              )}

              {/* 4. Widget Başlığı — image_map için step 2 */}
              <div className="space-y-2">
                <Label className="font-bold text-sm">4. Widget Başlığı</Label>
                <Input
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Örn: Sıcaklık Karşılaştırması"
                  className="h-12 bg-white border-gray-200 text-black"
                />
              </div>

              {/* 5. Gauge Ayarları (Sadece Gauge Seçiliyse) */}
              {addForm.type === "gauge" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-sm">Min Değer</Label>
                    <Input
                      type="number"
                      value={addForm.min}
                      onChange={(e) => setAddForm((p) => ({ ...p, min: Number(e.target.value) }))}
                      className="h-12 bg-white border-gray-200 text-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-sm">Max Değer</Label>
                    <Input
                      type="number"
                      value={addForm.max}
                      onChange={(e) => setAddForm((p) => ({ ...p, max: Number(e.target.value) }))}
                      className="h-12 bg-white border-gray-200 text-black"
                    />
                  </div>
                </div>
              )}

              {/* 5a. Çizgi Grafik Uyarı Eşiği */}
              {addForm.type === "line_chart" && (
                <div className="space-y-2">
                  <Label className="font-bold text-sm">Uyarı Eşiği (Opsiyonel)</Label>
                  <Input
                    type="number"
                    value={addForm.warningThreshold ?? ""}
                    onChange={(e) => setAddForm(p => ({ ...p, warningThreshold: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="Örn: 80"
                    className="h-12 bg-white border-gray-200 text-black"
                  />
                  <p className="text-[11px] text-gray-400">Bu değerin üzerinde grafikte kırmızı uyarı çizgisi gösterilir. Cihaz attribute&apos;larından otomatik doldurulabilir.</p>
                </div>
              )}

              {/* 5b. RPC Widget Ayarları */}
              {addForm.type?.startsWith("rpc_") && (
                <div className="space-y-4 p-4 rounded-xl bg-halo-50/30 border border-halo-200/50">
                  <Label className="font-bold text-sm text-halo-700">⚡ RPC Ayarları</Label>

                  <div className="space-y-2">
                    <Label className="font-bold text-sm">RPC Method</Label>
                    <Input
                      value={addForm.rpcMethod || ""}
                      onChange={(e) => setAddForm((p) => ({ ...p, rpcMethod: e.target.value }))}
                      placeholder="Örn: setValue, getStatus, reboot"
                      className="h-12 bg-white border-gray-200 text-black"
                    />
                  </div>

                  {addForm.type === "rpc_switch" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-sm">Parametre Anahtarı</Label>
                        <Input
                          value={addForm.rpcParamKey || "value"}
                          onChange={(e) => setAddForm((p) => ({ ...p, rpcParamKey: e.target.value }))}
                          placeholder="value"
                          className="h-12 bg-white border-gray-200 text-black"
                        />
                      </div>
                      <div /> {/* spacer */}
                    </div>
                  )}

                  {addForm.type === "rpc_slider" && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-sm">Parametre Anahtarı</Label>
                        <Input
                          value={addForm.rpcParamKey || "value"}
                          onChange={(e) => setAddForm((p) => ({ ...p, rpcParamKey: e.target.value }))}
                          placeholder="value"
                          className="h-12 bg-white border-gray-200 text-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-sm">Adım</Label>
                        <Input
                          type="number"
                          value={addForm.rpcStep || 1}
                          onChange={(e) => setAddForm((p) => ({ ...p, rpcStep: Number(e.target.value) }))}
                          className="h-12 bg-white border-gray-200 text-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-sm">Birim</Label>
                        <Input
                          value={addForm.rpcUnit || "%"}
                          onChange={(e) => setAddForm((p) => ({ ...p, rpcUnit: e.target.value }))}
                          placeholder="%"
                          className="h-12 bg-white border-gray-200 text-black"
                        />
                      </div>
                    </div>
                  )}

                  {addForm.type === "rpc_button" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-sm">Buton Etiketi</Label>
                        <Input
                          value={addForm.rpcButtonLabel || ""}
                          onChange={(e) => setAddForm((p) => ({ ...p, rpcButtonLabel: e.target.value }))}
                          placeholder="Yeniden Başlat"
                          className="h-12 bg-white border-gray-200 text-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-sm">Buton Rengi</Label>
                        <select
                          value={addForm.rpcButtonColor || "purple"}
                          onChange={(e) => setAddForm((p) => ({ ...p, rpcButtonColor: e.target.value }))}
                          className="h-12 w-full px-3 bg-white border border-gray-200 rounded-md text-black text-sm"
                        >
                          <option value="purple">Mor</option>
                          <option value="red">Kırmızı</option>
                          <option value="green">Yeşil</option>
                          <option value="blue">Mavi</option>
                          <option value="orange">Turuncu</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ekle Butonu */}
              <Button
                onClick={handleAddWidget}
                className="w-full h-12 bg-halo-600 hover:bg-halo-700 text-white text-base"
              >
                <Plus className="mr-2 h-5 w-5" />
                Widget Ekle
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Paylaşım Modal ── */}
      {shareOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShareOpen(false)}>
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                <Share2 className="h-5 w-5 text-halo-600" />
                Pano Paylaşımı
              </h2>
              <button
                onClick={() => setShareOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-text-main">Public Paylaşım</p>
                  <p className="text-xs text-text-muted mt-0.5">Herkesin görebileceği bir link oluşturun.</p>
                </div>
                <button
                  onClick={shareData.isPublic ? handleDisableShare : handleEnableShare}
                  disabled={shareLoading}
                  className={`relative w-12 h-6 rounded-full transition-colors ${shareData.isPublic ? "bg-halo-600" : "bg-gray-300"
                    } ${shareLoading ? "opacity-50" : ""}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${shareData.isPublic ? "translate-x-6" : ""
                      }`}
                  />
                </button>
              </div>

              {shareData.isPublic ? (
                <>
                  {/* Public URL */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                      <Link className="h-3 w-3" />
                      Public URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareData.publicUrl || ""}
                        className="flex-1 h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono"
                      />
                      <button
                        onClick={() => handleCopy(shareData.publicUrl, "url")}
                        className="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-halo-50 hover:border-halo-300 transition-colors"
                      >
                        {copied === "url" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Embed Code */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Embed Kodu
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={`<iframe src="${shareData.publicUrl}" width="100%" height="600" frameborder="0"></iframe>`}
                        rows={3}
                        className="w-full p-3 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-mono resize-none"
                      />
                      <button
                        onClick={() => handleCopy(`<iframe src="${shareData.publicUrl}" width="100%" height="600" frameborder="0"></iframe>`, "embed")}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        {copied === "embed" ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Share2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-text-muted">Paylaşım kapalı</p>
                  <p className="text-xs text-gray-400 mt-1">Paylaşımı açmak için yukarıdaki düğmeyi kullanın.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
