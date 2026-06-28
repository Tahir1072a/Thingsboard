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
import {
  Save, ArrowLeft, Plus, X,
  LayoutDashboard, Pencil, Check,
  Share2, Link, Copy, Link2,
} from "lucide-react";
import toast from "react-hot-toast";
import Breadcrumbs from "@/components/common/breadcrumbs";
import WidgetConfigModal from "@/components/panels/widgets/config/WidgetConfigModal";
import AliasManagerPanel from "@/components/panels/widgets/config/AliasManagerPanel";
import { AnimatePresence } from "framer-motion";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

/** 12-kolon layout'u 24-kolona migrate eder */
function migrateLayoutTo24Cols(widgets, gridCols) {
  if (gridCols === 24) return widgets;
  return widgets.map(w => ({
    ...w,
    x: Math.min((w.x ?? 0) * 2, 23),
    w: Math.min((w.w ?? 4) * 2, 24),
  }));
}

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
  const [aliasPanel, setAliasPanel] = useState(false); // Alias yönetim paneli

  // Container width ölçümü (react-grid-layout v2 hook)
  const { width: containerWidth, containerRef } = useContainerWidth({ initialWidth: 1200 });

  // Fixed row height for consistent layout across screen sizes
  const ROW_HEIGHT = 50;

  // Widget ekleme/düzenleme modalı
  const [widgetModal, setWidgetModal] = useState({ open: false, mode: "add", widget: null });
  const [devices, setDevices] = useState([]);

  // Entity Alias çözümlenmiş cihazlar: { [aliasId]: [{id, name, profileName}] }
  const [resolvedDevices, setResolvedDevices] = useState({});

  // ------------------------------------------------------------------ //
  // Veri çekme
  // ------------------------------------------------------------------ //
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/${id}`);
      const data = await res.json();
      if (data.ok) {
        // 12-kolon layout'u 24-kolona migrate eder
        const migratedWidgets = migrateLayoutTo24Cols(data.data.widgets || [], data.data.gridCols);

        // Widget pozisyonlarını sanitize et (mevcut veritabanı verisinde null/undefined olabilir)
        const sanitized = {
          ...data.data,
          widgets: migratedWidgets.map((w, idx) => ({
            ...w,
            x: Number.isFinite(w.x) && w.x !== null ? w.x : (idx % 24),
            y: Number.isFinite(w.y) && w.y !== null ? w.y : (idx * 10),
            w: Number.isFinite(w.w) && w.w !== null ? w.w : 6,
            h: Number.isFinite(w.h) && w.h !== null ? w.h : 3,
          })),
        };
        setDashboard(sanitized);
        setTempName(sanitized.name);
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

  // ── Alias'ları çözümle ──
  const resolveEntityAliases = useCallback(async (aliases) => {
    if (!aliases || aliases.length === 0) {
      setResolvedDevices({});
      return;
    }
    try {
      const res = await fetch("/api/alias/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases }),
      });
      const data = await res.json();
      if (data.ok && data.resolved) {
        setResolvedDevices(data.resolved);
      }
    } catch (err) {
      console.error("Alias çözümleme hatası:", err);
    }
  }, []);

  // Dashboard yüklendiğinde alias'ları çözümle
  useEffect(() => {
    if (dashboard?.entityAliases?.length > 0) {
      resolveEntityAliases(dashboard.entityAliases);
    }
  }, [dashboard?.entityAliases, resolveEntityAliases]);

  // ------------------------------------------------------------------ //
  // Widget ekleme / düzenleme (modal)
  // ------------------------------------------------------------------ //
  const handleWidgetSave = (widgetObj) => {
    if (widgetModal.mode === "edit" && widgetModal.widget) {
      setDashboard((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.i === widgetObj.i ? { ...w, ...widgetObj } : w
        ),
      }));
      toast.success("Widget güncellendi! Kaydetmeyi unutmayın.");
    } else {
      setDashboard((prev) => ({
        ...prev,
        widgets: [...prev.widgets, widgetObj],
      }));
      toast.success("Widget eklendi! Kaydetmeyi unutmayın.");
    }
    setWidgetModal({ open: false, mode: "add", widget: null });
  };

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

      // Widget verilerini sanitize et
      const sanitizedWidgets = (dashboard.widgets || []).map((w, idx) => ({
        ...w,
        x: Number.isFinite(w.x) ? w.x : (idx % 24),
        y: Number.isFinite(w.y) ? w.y : (idx * 10),
        w: Number.isFinite(w.w) ? w.w : 6,
        h: Number.isFinite(w.h) ? w.h : 3,
      }));

      // 15 saniye timeout — sunucu yanıt vermezse zorla kes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`/api/dashboard/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dashboard.name,
          description: dashboard.description,
          widgets: sanitizedWidgets,
          entityAliases: dashboard.entityAliases || [],
          gridCols: 24,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.ok) {
        toast.success("Pano kaydedildi!");
        setEditMode(false);
      } else {
        toast.error(data.message || "Kaydetme başarısız.");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        toast.error("Kaydetme zaman aşımına uğradı. Lütfen tekrar deneyin.");
      } else {
        toast.error("Kaydetme hatası.");
      }
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

  // Render
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
    minW: 3,
    minH: 2,
    maxW: 24,
    maxH: 16,
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
                onClick={() => setWidgetModal({ open: true, mode: "add", widget: null })}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAliasPanel(true)}
                className="border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
              >
                <Link2 className="mr-1.5 h-4 w-4" />
                Alias Yönetimi
                {(dashboard?.entityAliases?.length || 0) > 0 && (
                  <span className="ml-1.5 bg-purple-200 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {dashboard.entityAliases.length}
                  </span>
                )}
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
            cols={{ lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 }}
            rowHeight={ROW_HEIGHT}
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".widget-drag-handle"
            compactType="vertical"
            margin={containerWidth < 768 ? [8, 8] : [12, 12]}
          >
            {dashboard.widgets.map((widget) => (
              <div key={widget.i}>
                <WidgetRenderer
                  widget={widget}
                  isEditMode={editMode}
                  resolvedDevices={resolvedDevices}
                  onDelete={() => handleRemoveWidget(widget.i)}
                  onEdit={(w) => setWidgetModal({ open: true, mode: "edit", widget: w })}
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

      {/* ── Widget Ekleme/Düzenleme Modalı ── */}
      <WidgetConfigModal
        open={widgetModal.open}
        mode={widgetModal.mode}
        widget={widgetModal.widget}
        devices={devices}
        entityAliases={dashboard?.entityAliases || []}
        onAliasChange={(newAliases) => {
          setDashboard((prev) => ({ ...prev, entityAliases: newAliases }));
          resolveEntityAliases(newAliases);
        }}
        onSave={handleWidgetSave}
        onClose={() => setWidgetModal({ open: false, mode: "add", widget: null })}
      />

      {/* ── Alias Yönetim Paneli ── */}
      <AnimatePresence>
        {aliasPanel && (
          <AliasManagerPanel
            aliases={dashboard?.entityAliases || []}
            widgets={dashboard?.widgets || []}
            devices={devices}
            onAliasChange={(newAliases) => {
              setDashboard((prev) => ({ ...prev, entityAliases: newAliases }));
              resolveEntityAliases(newAliases);
            }}
            onClose={() => setAliasPanel(false)}
          />
        )}
      </AnimatePresence>


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
