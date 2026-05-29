"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Bell,
  LayoutDashboard,
  Router,
  UserCheck,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Ana Sayfa", icon: Home },
  { href: "/alarmlar", label: "Alarmlar", icon: Bell },
  { href: "/panolar", label: "Panolar", icon: LayoutDashboard },
  { href: "/devices", label: "Cihazlar", icon: Router },
  { href: "/device-profile", label: "Cihaz Profilleri", icon: UserCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden h-screen flex-col md:flex bg-white/95 backdrop-blur-xl border-r border-white/20 rounded-none transition-all duration-300 ease-in-out shadow-sm",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo Alanı */}
      <div className="flex h-20 items-center justify-center border-b border-white/20">
        <div className="flex items-center gap-3 animate-fade-in">
          {/* Logo - Gradient Background */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-halo-500 to-halo-700 shadow-lg">
            <span className="text-xl font-bold text-white">P</span>
          </div>
          <span
            className={cn(
              "text-xl font-bold text-gradient whitespace-nowrap transition-all duration-300 overflow-hidden",
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}
          >
            Pengona Things
          </span>
        </div>
      </div>

      {/* Navigasyon Alanı */}
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {navLinks.map((link, index) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.label}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={cn(
                "group relative flex items-center rounded-xl py-3 text-sm font-medium transition-all duration-200 animate-slide-in",
                isActive
                  ? "bg-gradient-to-r from-halo-600 to-halo-700 text-white shadow-lg scale-[1.02]"
                  : "text-text-muted hover:bg-white/50 hover:text-text-main hover:scale-[1.01]",
                collapsed ? "justify-center px-2.5" : "gap-3 px-4"
              )}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {/* Icon Container */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-white/20 shadow-inner"
                    : "bg-white/30 group-hover:bg-white/50"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive
                      ? "text-white"
                      : "text-text-muted group-hover:text-text-main group-hover:scale-110"
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "flex-1 whitespace-nowrap transition-all duration-300 overflow-hidden",
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                {link.label}
              </span>

              {/* Aktif İndikatör */}
              {isActive && !collapsed && (
                <div className="h-2 w-2 rounded-full bg-white shadow-lg animate-fade-in" />
              )}

              {/* Collapsed Tooltip */}
              {collapsed && (
                <div className="absolute left-full ml-3 rounded-lg bg-black/90 px-3 py-1.5 text-xs text-white shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 border border-white/10">
                  {link.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Toggle Butonu */}
      <div className={cn("border-t border-white/20", collapsed ? "p-2" : "p-4")}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-text-muted hover:bg-white/50 hover:text-text-main transition-all duration-200"
          title={collapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="h-5 w-5 shrink-0" />
              <span>Menüyü Daralt</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

