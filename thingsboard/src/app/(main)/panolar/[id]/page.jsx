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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Save, ArrowLeft, Plus, X, GripVertical,
  LayoutDashboard, Trash2, Pencil, Check,
} from "lucide-react";
import toast from "react-hot-toast";

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

  // Container width ölçümü (react-grid-layout v2 hook)
  const { width: containerWidth, containerRef } = useContainerWidth({ initialWidth: 1200 });

  // Widget ekleme drawer
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [addForm, setAddForm] = useState({
    type: "",
    deviceId: "",
    keys: "",
    title: "",
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
    } catch {}
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchDevices();
  }, [fetchDashboard, fetchDevices]);

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
  // Widget ekleme
  // ------------------------------------------------------------------ //
  const handleAddWidget = () => {
    if (!addForm.type || !addForm.deviceId || !addForm.title) {
      toast.error("Tip, cihaz ve başlık zorunludur.");
      return;
    }

    const typeConfig = WIDGET_TYPES.find((t) => t.type === addForm.type);
    const keysArray = addForm.keys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const newWidget = {
      i: `w-${Date.now()}`,
      type: addForm.type,
      deviceId: addForm.deviceId,
      keys: keysArray,
      title: addForm.title,
      config: {},
      x: 0,
      y: Infinity, // en alta ekle
      w: typeConfig?.defaultSize?.w || 4,
      h: typeConfig?.defaultSize?.h || 3,
    };

    setDashboard((prev) => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));

    setAddForm({ type: "", deviceId: "", keys: "", title: "" });
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
    <div className="space-y-4 p-1">
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
            <div
              key={widget.i}
              className="rounded-xl border border-border bg-card shadow-sm overflow-visible transition-shadow hover:shadow-md flex flex-col"
            >
              {/* Widget Header (düzenleme modunda) */}
              {editMode && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/80 border-b border-gray-100 shrink-0">
                  <div className="widget-drag-handle cursor-grab active:cursor-grabbing flex items-center gap-1 text-text-muted">
                    <GripVertical className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Taşı</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveWidget(widget.i);
                    }}
                    className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {/* Widget İçeriği */}
              <div className="p-3 flex-1 min-h-0">
                <WidgetRenderer widget={widget} />
              </div>
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
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          isSelected
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

              {/* 2. Cihaz Seçimi */}
              <div className="space-y-2">
                <Label className="font-bold text-sm">2. Cihaz</Label>
                <Select
                  value={addForm.deviceId}
                  onValueChange={(val) => setAddForm((p) => ({ ...p, deviceId: val }))}
                >
                  <SelectTrigger className="h-12 bg-white border-gray-200 text-black">
                    <SelectValue placeholder="Cihaz seçin..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 shadow-lg">
                    {devices.map((d) => (
                      <SelectItem key={d._id} value={d._id} className="cursor-pointer">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Telemetri Key'leri */}
              <div className="space-y-2">
                <Label className="font-bold text-sm">3. Telemetri Key&apos;leri</Label>
                <Input
                  value={addForm.keys}
                  onChange={(e) => setAddForm((p) => ({ ...p, keys: e.target.value }))}
                  placeholder="temperature, humidity"
                  className="h-12 bg-white border-gray-200 text-black"
                />
                <p className="text-[11px] text-gray-400">
                  Birden fazla key virgülle ayırın. Gauge ve Kart tek key kullanır.
                </p>
              </div>

              {/* 4. Başlık */}
              <div className="space-y-2">
                <Label className="font-bold text-sm">4. Widget Başlığı</Label>
                <Input
                  value={addForm.title}
                  onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Örn: Sıcaklık Grafiği"
                  className="h-12 bg-white border-gray-200 text-black"
                />
              </div>

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
    </div>
  );
}
