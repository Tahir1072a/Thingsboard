"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DeviceFilters() {
  return (
    <div className="glass p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-main flex items-center gap-2">
          <Filter className="h-5 w-5 text-halo-600" />
          Filtreler ve Arama
        </h3>

        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed bg-halo-100 border-gray-400/50 text-text-muted hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all duration-300"
        >
          <X className="mr-2 h-4 w-4" />
          Filtreleri Temizle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        {/* Arama */}
        <div className="relative lg:col-span-6">
          <Search className="absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Cihaz adı, profil veya etiket ara..."
            className="pl-10 glass-strong border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-halo-500 transition-all placeholder:text-gr"
          />
        </div>

        <div className="flex gap-4 lg:col-span-2">
          <div className="w-full">
            <Select>
              <SelectTrigger className="glass-strong border-white/60 w-full">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <Select>
              <SelectTrigger className="glass-strong border-white/60 w-full">
                <SelectValue placeholder="Cihaz Profili" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="thermostat">Termostat</SelectItem>
                <SelectItem value="sensor">Sensör</SelectItem>
                <SelectItem value="gateway">Gateway</SelectItem>
                <SelectItem value="light">Akıllı Lamba</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
