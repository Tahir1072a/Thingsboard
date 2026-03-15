"use client";

/**
 * /panolar — Pano Listesi
 *
 * Kullanıcının panolarını kartlar halinde listeler.
 * Yeni pano oluşturma dialogs.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Plus, Trash2, Calendar, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";

export default function PanolarPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchDashboards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (data.ok) setDashboards(data.data);
    } catch (err) {
      console.error(err);
      toast.error("Panolar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Pano adı zorunludur.");
      return;
    }
    try {
      setCreating(true);
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Pano oluşturuldu!");
        setOpenCreate(false);
        setNewName("");
        setNewDesc("");
        router.push(`/panolar/${data.data._id}`);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Hata oluştu.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" panosunu silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/dashboard/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success(`"${name}" silindi.`);
        fetchDashboards();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Silme hatası.");
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Panolar</h1>
          <p className="text-sm text-text-muted mt-1">
            IoT cihazlarınız için özel panolar oluşturun ve yönetin
          </p>
        </div>
        <Button
          onClick={() => setOpenCreate(true)}
          className="bg-gradient-to-r from-halo-600 to-halo-700 text-white shadow-lg hover:shadow-halo-600/30 transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Yeni Pano
        </Button>
      </div>

      {/* Pano Kartları */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : dashboards.length === 0 ? (
        <div className="glass rounded-xl text-center py-20 px-8">
          <LayoutDashboard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-text-main">Henüz pano oluşturulmamış</h3>
          <p className="text-sm text-text-muted mt-2 mb-6">
            Cihazlarınızın verilerini görselleştirmek için ilk panonuzu oluşturun.
          </p>
          <Button
            onClick={() => setOpenCreate(true)}
            className="bg-gradient-to-r from-halo-600 to-halo-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            İlk Panonuzu Oluşturun
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((dashboard) => (
            <div
              key={dashboard._id}
              onClick={() => router.push(`/panolar/${dashboard._id}`)}
              className="glass rounded-xl p-5 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-200 group relative"
            >
              {/* Sil Butonu */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(dashboard._id, dashboard.name);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/50 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* İkon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-halo-400 to-halo-600 shadow-md mb-4">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>

              {/* Ad ve Açıklama */}
              <h3 className="text-base font-bold text-text-main mb-1 truncate">
                {dashboard.name}
              </h3>
              {dashboard.description && (
                <p className="text-xs text-text-muted line-clamp-2 mb-3">
                  {dashboard.description}
                </p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 text-[11px] text-text-muted">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {dashboard.widgetCount} widget
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(dashboard.updatedAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Oluşturma Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="glass-strong sm:max-w-md border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-bold text-text-main">
              <div className="p-2 bg-halo-100 rounded-lg">
                <Plus className="h-5 w-5 text-halo-600" />
              </div>
              Yeni Pano Oluştur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold">Pano Adı *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Örn: Fabrika İzleme Panosu"
                className="h-12 bg-white/90 text-black border-gray-200"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Açıklama</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Pano hakkında kısa bilgi..."
                className="h-12 bg-white/90 text-black border-gray-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)} className="border-gray-300">
              İptal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-halo-600 hover:bg-halo-700 text-white"
            >
              {creating ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
