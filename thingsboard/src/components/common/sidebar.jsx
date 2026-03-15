"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Bell,
  LayoutDashboard,
  Router,
  UserCheck,
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

  return (
    <aside className="hidden h-screen w-72 flex-col md:flex glass border-r border-white/20 backdrop-blur-xl rounded-none">
      {/* Logo Alanı */}
      <div className="flex h-20 items-center justify-center border-b border-white/20">
        <div className="flex items-center gap-3 animate-fade-in">
          {/* Logo - Gradient Background */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-halo-500 to-halo-700 shadow-lg">
            <span className="text-xl font-bold text-white">P</span>
          </div>
          <span className="text-xl font-bold text-gradient">
            Pengona Things
          </span>
        </div>
      </div>

      {/* Navigasyon Alanı */}
      <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar p-4">
        {navLinks.map((link, index) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 animate-slide-in",
                isActive
                  ? "bg-gradient-to-r from-halo-600 to-halo-700 text-white shadow-lg scale-[1.02]"
                  : "text-text-muted hover:bg-white/50 hover:text-text-main hover:scale-[1.01]"
              )}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {/* Icon Container */}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
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
              <span className="flex-1">{link.label}</span>

              {/* Aktif İndikatör */}
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-white shadow-lg animate-fade-in" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
