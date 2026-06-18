"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Bell, User, LogOut, ChevronDown, AlertTriangle, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import toast from "react-hot-toast";

export default function Header({ pageTitle = "Anasayfa" }) {
  const router = useRouter();
  const { data: session } = useSession();

  const userName = session?.user?.name || session?.user?.email || "Kullanıcı";
  const userRole = session?.user?.role || "Kullanıcı";
  const userInitial = userName.charAt(0).toUpperCase();

  const [activeCount, setActiveCount] = useState(0);
  const [recentAlarms, setRecentAlarms] = useState([]);

  const fetchAlarmCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alarm?status=ACTIVE&limit=5");
      const data = await res.json();
      if (data.ok) {
        setActiveCount(data.activeCount || 0);
        setRecentAlarms(data.data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlarmCount();
    const interval = setInterval(fetchAlarmCount, 30000);
    return () => clearInterval(interval);
  }, [fetchAlarmCount]);

  // SSE ile anlık alarm bildirimi
  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.addEventListener("alarm", (e) => {
      try {
        const alarm = JSON.parse(e.data);
        // Sadece yeni aktif alarmlar için bildirim göster
        if (alarm.status === "ACTIVE") {
          const severityEmoji = alarm.severity === "CRITICAL" ? "🔴" : alarm.severity === "MAJOR" ? "🟠" : "🟡";
          toast(
            (t) => (
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push("/alarmlar");
                }}
              >
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">
                    {severityEmoji} {alarm.type}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {alarm.deviceName} • {alarm.details?.key}: {alarm.details?.triggerValue}
                  </div>
                  <div className="text-xs text-blue-500 mt-1">
                    Alarma git →
                  </div>
                </div>
              </div>
            ),
            {
              duration: 8000,
              style: { border: alarm.severity === "CRITICAL" ? "1px solid #ef4444" : "1px solid #f97316" },
            }
          );
          // Badge'ı hemen güncelle
          setActiveCount((prev) => prev + 1);
          setRecentAlarms((prev) => [alarm, ...prev.slice(0, 4)]);
        } else if (alarm.status === "CLEARED") {
          // Temizlenen alarmı listeden kaldır
          setActiveCount((prev) => Math.max(0, prev - 1));
          setRecentAlarms((prev) => prev.filter((a) => a._id !== alarm._id));
        }
      } catch {}
    });
    return () => es.close();
  }, [router]);

  const handleAcknowledge = async (alarmId) => {
    try {
      const res = await fetch("/api/alarm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alarmId, action: "acknowledge" }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Alarm onaylandı.");
        fetchAlarmCount();
      }
    } catch {}
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    toast.success("Başarıyla çıkış sağlandı");
    router.push("/login");
  };

  const SEVERITY_COLORS = {
    CRITICAL: "text-red-600",
    MAJOR: "text-orange-500",
    MINOR: "text-yellow-500",
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20 backdrop-blur-xl rounded-none">
      <div className="flex h-20 items-center justify-between px-6 lg:px-8">
        {/* Sol Taraf */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gradient">{pageTitle}</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {new Date().toLocaleDateString("tr-TR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Sağ Taraf */}
        <div className="flex items-center gap-3">
          {/* Bildirim Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 hover:scale-105 transition-all duration-200 border border-white/60"
              >
                <Bell className="h-5 w-5 text-text-main" />
                {activeCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-red-500 to-pink-500 border-2 border-white text-[10px] font-bold animate-pulse">
                    {activeCount > 9 ? "9+" : activeCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 glass-strong border-white/60 shadow-2xl mt-2"
            >
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="font-semibold">Alarmlar</span>
                {activeCount > 0 && (
                  <Badge className="bg-red-500 text-white text-[10px] px-1.5">
                    {activeCount} aktif
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {recentAlarms.length === 0 ? (
                <div className="py-6 text-center text-sm text-text-muted">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-300 mb-2" />
                  Aktif alarm yok
                </div>
              ) : (
                recentAlarms.slice(0, 5).map((alarm) => (
                  <DropdownMenuItem
                    key={alarm._id}
                    className="flex items-start gap-3 py-3 px-3 cursor-pointer hover:bg-white/60 rounded-lg"
                    onClick={() => router.push("/alarmlar")}
                  >
                    <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${SEVERITY_COLORS[alarm.severity] || ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-main truncate">
                        {alarm.type}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        {alarm.deviceName} • {alarm.details?.key}: {typeof alarm.details?.triggerValue === "number" ? alarm.details.triggerValue.toFixed(1) : alarm.details?.triggerValue}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcknowledge(alarm._id);
                      }}
                      className="p-1 rounded hover:bg-blue-50 text-blue-500 shrink-0"
                      title="Onayla"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuItem>
                ))
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/alarmlar")}
                className="text-center text-sm text-halo-600 font-medium cursor-pointer hover:bg-halo-50 rounded-lg justify-center"
              >
                Tüm Alarmları Gör
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Ayırıcı */}
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

          {/* Kullanıcı Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 h-12 px-3 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 hover:scale-[1.02] transition-all duration-200 border border-white/60"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-halo-500 to-halo-700 shadow-md">
                  <span className="text-sm font-bold text-white">{userInitial}</span>
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-sm font-semibold text-text-main">{userName}</div>
                  <div className="text-xs text-text-muted">{userRole}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-text-muted" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 glass-strong border-white/60 shadow-2xl mt-2 animate-fade-in"
            >
              <DropdownMenuLabel className="font-semibold text-text-main">
                Hesabım
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200/50" />
              <DropdownMenuItem className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-white/60 rounded-lg transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-halo-100">
                  <User className="h-4 w-4 text-halo-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-main">Profil</div>
                  <div className="text-xs text-text-muted">Hesap ayarlarını yönet</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200/50" />
              <DropdownMenuItem
                className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-red-50 rounded-lg transition-colors text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => handleLogout()}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                  <LogOut className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">Çıkış Yap</div>
                  <div className="text-xs opacity-75">Hesabından güvenle çık</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
