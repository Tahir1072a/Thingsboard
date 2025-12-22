"use client";

import { Button } from "../ui/button";
import { Bell, User, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";

export default function Header() {
  const pageTitle = "Anasayfa";
  const notificationCount = 3;

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20 backdrop-blur-xl rounded-none">
      <div className="flex h-20 items-center justify-between px-6 lg:px-8">
        {/* Sol Taraf - Başlık */}
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

        {/* Sağ Taraf - Actions */}
        <div className="flex items-center gap-3">
          {/* Bildirim Butonu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-11 w-11 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 hover:scale-105 transition-all duration-200 border border-white/60"
            >
              <Bell className="h-5 w-5 text-text-main" />
              {notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-red-500 to-pink-500 border-2 border-white text-[10px] font-bold">
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Ayırıcı */}
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

          {/* Kullanıcı Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 h-12 px-3 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 hover:scale-[1.02] transition-all duration-200 border border-white/60"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-halo-500 to-halo-700 shadow-md">
                  <User className="h-5 w-5 text-white" />
                </div>

                <div className="hidden text-left md:block">
                  <div className="text-sm font-semibold text-text-main">
                    Kullanıcı Adı
                  </div>
                  <div className="text-xs text-text-muted">Tenant Admin</div>
                </div>

                {/* Dropdown İkonu */}
                <ChevronDown className="h-4 w-4 text-text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
                  <div className="text-sm font-medium text-text-main">
                    Profil
                  </div>
                  <div className="text-xs text-text-muted">
                    Hesap ayarlarını yönet
                  </div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-gray-200/50" />

              <DropdownMenuItem className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-red-50 rounded-lg transition-colors text-red-600 focus:text-red-600 focus:bg-red-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                  <LogOut className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">Çıkış Yap</div>
                  <div className="text-xs opacity-75">
                    Hesabından güvenle çık
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
