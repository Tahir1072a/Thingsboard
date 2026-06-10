"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Filter,
  X,
  CheckSquare,
  Square,
  MoreVertical,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { RotateCw, PlusCircle } from "lucide-react";
import { CustomTableHeader, CustomTableRow } from "./custom-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

// Cihaz ekleme, arama ve filtreleme olayları dinamik bir yapı olacak şekilde bu componente yazılmalıdır.
// Component tüm table'ların headerı olarak kullanılacaktır.
// Bu component sadece sidebar sayfaları için kullanılacaktır.
export function TableHeader({
  advert,
  title,
  addButtonName,
  filterConfig = [],
  onFilterChange,
  onRefresh,
  onAdd,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFilterChange = (newFilters) => {
    onFilterChange?.(newFilters);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;

    try {
      setIsRefreshing(true);

      await onRefresh();
      // Sadece geliştirme modu için...
      await new Promise((resolve) => setTimeout(resolve, 200));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 mb-6 animate-fade-in">
      {/* Sayfa Başlığı ve Aksiyon Butonları */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient">{title}</h2>
          {advert && <p className="text-sm text-text-muted mt-1">{advert}</p>}
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-halo-200 to-halo-300 hover:from-halo-400 hover:to-halo-500 shadow-lg"
          >
            <RotateCw
              className={`mr-2 h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Yenileniyor..." : "Yenile"}
          </Button>

          <Button
            onClick={onAdd}
            className="bg-gradient-to-r from-halo-600 to-halo-700 hover:from-halo-700 hover:to-halo-800 shadow-lg text-white cursor-pointer"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            {addButtonName}
          </Button>
        </div>
      </div>

      {/* Filtreler */}
      {filterConfig.length > 0 && (
        <TableFilter
          onFilterChange={handleFilterChange}
          filterConfig={filterConfig}
        />
      )}
    </div>
  );
}

// Bu component ise yandan açılan kısımlar için kullanılacaktır.
// HeaderActions, bir dizi icon ve onClick olayları içeren hızlı aksiyon düğmeleridir.
export function TableHeaderSheet({
  title,
  selectConfig,
  actions = [],
  onSearch,
  className,
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);

  const { register, watch, reset } = useForm({
    defaultValues: { search: "" },
  });

  const searchValue = watch("search");
  const { ref: registerRef, ...searchRegister } = register("search");

  // Focus on search open
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150); // Animasyon bittikten sonra focus
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Debounced search
  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => {
      onSearch(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);

  const handleSearchClose = () => {
    setIsSearchOpen(false);
    reset({ search: "" });
    onSearch?.("");
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "glass border-b border-white/20",
        "transition-all duration-300 ease-out",
        className
      )}
    >
      {/* Normal Header */}
      <div
        className={cn(
          "flex items-center justify-between py-4 px-5",
          "transition-all duration-300 ease-out",
          isSearchOpen
            ? "opacity-0 -translate-x-4 pointer-events-none absolute inset-0"
            : "opacity-100 translate-x-0"
        )}
      >
        {/* Sol: Başlık + Select */}
        <div className="flex items-center gap-4">
          <h4 className="font-semibold text-text-main text-lg tracking-tight">
            {title}
          </h4>

          {selectConfig && (
            <Select
              value={selectConfig.value}
              onValueChange={selectConfig.onChange}
            >
              <SelectTrigger
                className={cn(
                  "w-[200px] h-9 text-sm",
                  "glass-strong border-white/40",
                  "hover:border-halo-400/50 hover:bg-white/40",
                  "focus:ring-2 focus:ring-halo-500/20 focus:border-halo-500",
                  "transition-all duration-200"
                )}
              >
                <SelectValue
                  placeholder={selectConfig.placeholder || "Seçiniz"}
                />
              </SelectTrigger>
              <SelectContent className="glass-strong border-white/40 shadow-xl">
                {selectConfig.options.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="hover:bg-halo-50/50 focus:bg-halo-50/50 cursor-pointer transition-colors"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Sağ: Aksiyonlar */}
        <div className="flex items-center gap-1">
          {actions
            .filter((a) => a.show !== false)
            .map((action, idx) => (
              <Button
                key={idx}
                variant="ghost"
                size="icon"
                onClick={action.onClick}
                title={action.tooltip}
                className={cn(
                  "h-9 w-9 rounded-lg",
                  "text-text-muted",
                  "hover:text-halo-600 hover:bg-halo-50/50",
                  "active:scale-95",
                  "transition-all duration-200"
                )}
              >
                {action.icon}
              </Button>
            ))}

          {/* Search Toggle Button */}
          {onSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              title="Ara"
              className={cn(
                "h-9 w-9 rounded-lg",
                "text-text-muted",
                "hover:text-halo-600 hover:bg-halo-50/50",
                "active:scale-95",
                "transition-all duration-200"
              )}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Mode */}
      <div
        className={cn(
          "flex items-center gap-3 py-4 px-5",
          "transition-all duration-300 ease-out",
          isSearchOpen
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4 pointer-events-none absolute inset-0"
        )}
      >
        {/* Geri Butonu */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSearchClose}
          className={cn(
            "h-9 w-9 rounded-lg flex-shrink-0",
            "text-text-muted",
            "hover:text-text-main hover:bg-white/40",
            "active:scale-95",
            "transition-all duration-200"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            {...searchRegister}
            ref={(e) => {
              registerRef(e);
              searchInputRef.current = e;
            }}
            placeholder="Öznitelik ara..."
            className={cn(
              "pl-10 pr-4 h-9",
              "glass-strong border-white/40",
              "focus-visible:ring-2 focus-visible:ring-halo-500/20",
              "focus-visible:border-halo-500",
              "focus-visible:ring-offset-0",
              "placeholder:text-text-muted/60",
              "transition-all duration-200"
            )}
          />
        </div>

        {/* Clear/Close Button */}
        {searchValue && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => reset({ search: "" })}
            className={cn(
              "h-9 w-9 rounded-lg flex-shrink-0",
              "text-text-muted",
              "hover:text-red-500 hover:bg-red-50/50",
              "active:scale-95",
              "transition-all duration-200",
              "animate-fade-in"
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// FilterConfig => [{ key, placeholder, options: [{label, value}] }] alan bir yapıdır.
export default function TableFilter({ filterConfig = [], onFilterChange }) {
  const visibleFilters = filterConfig.slice(0, 2);
  const searchColSpan =
    visibleFilters.length > 0 ? "lg:col-span-6" : "lg:col-span-8";
  const filterColSpan = "lg:col-span-2";

  const { register, control, watch, reset, setValue } = useForm({
    defaultValues: {
      search: "",
    },
  });

  // Formdaki tüm değerleri anlık izle
  const formValues = watch();
  const prevFiltersRef = useRef(JSON.stringify({}));

  useEffect(() => {
    if (!onFilterChange) return;
    // Kullanıcı her tuşa bastığında backend'e istek gitmesin (Performans)
    const timer = setTimeout(() => {
      // Boş ("") veya undefined olan filtreleri temizleyip gönderelim
      // Object fromEntires [["status","active"]] gibi bir diziyi key value değerleirne ayırır. Yapı dizi içinde dizi şeklinde olmalıdır.
      // Object.entries de bir dictionary (key,value) yapısını ikili dizi içeren, tekil bir diziye dönüştürür.
      const activeFilters = Object.fromEntries(
        Object.entries(formValues).filter(
          ([_, value]) =>
            value !== "" &&
            value !== "all" &&
            value !== null &&
            value !== undefined
        )
      );

      const currentFiltersString = JSON.stringify(activeFilters);

      if (currentFiltersString !== prevFiltersRef.current) {
        // Sadece ve sadece içerik gerçekten değiştiyse parent'a haber ver
        prevFiltersRef.current = currentFiltersString;
        onFilterChange(activeFilters);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formValues, onFilterChange]);

  // Temizleme Fonksiyonu
  const handleClearFilters = () => {
    // Formu tamamen sıfırla (Default values'a döner)
    reset({ search: "" });

    // Select componentleri bazen reset'i algılamayabilir, manuel tetiklemek gerekebilir.
    visibleFilters.forEach((f) => setValue(f.key, ""));
  };

  return (
    <div className="glass p-6 space-y-4">
      {/* --- BAŞLIK ALANI --- */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-main flex items-center gap-2">
          <Filter className="h-5 w-5 text-halo-600" />
          Filtreler ve Arama
        </h3>

        {/* Sadece filtre yapıldıysa veya arama varsa butonu göster (Opsiyonel: Her zaman göstermek istersen opacity şartını kaldırabilirsin) */}
        <div className={`transition-opacity duration-300 `}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 border-dashed bg-halo-100 border-gray-400/50 text-text-muted hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all duration-300"
          >
            <X className="mr-2 h-4 w-4" />
            Filtreleri Temizle
          </Button>
        </div>
      </div>

      {/* --- GRID ALANI --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        <div className={`relative ${searchColSpan}`}>
          <Search className="absolute z-10 left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            {...register("search")}
            placeholder="Cihaz adı, profil veya etiket ara..."
            className="pl-10 glass-strong border-white/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-halo-500 transition-all placeholder:text-gr"
          />
        </div>

        {/* 2. DİNAMİK SELECTLER (Controller ile çalışır) */}
        {visibleFilters.length > 0 && (
          <div className={`flex gap-4 ${filterColSpan}`}>
            {visibleFilters.map((filter) => (
              <div key={filter.key} className="w-full">
                <Controller
                  name={filter.key}
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <SelectTrigger className="glass-strong border-white/60 w-full">
                        <SelectValue
                          placeholder={filter.placeholder || filter.key}
                        />
                      </SelectTrigger>
                      <SelectContent className="glass-strong">
                        <SelectItem value="all">Tümü</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Genel tablo içeriğini oluşturan component
// bulkActions => toplu seçimde yapılan toplu eylemler. Bulk Actions yapısı: varyant, label, icon, onClick
// rowClassName, bize satır bazlı css uygulayabilmemiz sağlayan güzel bir fonksiyondur.
export function TableContent({
  data,
  columns,
  title,
  onRowClick,
  bulkActions,
  headerActions,
  rowActions,
  rowClassName,
  pagination,
  gridClassName = "grid-cols-12",
  emptyState,
  getRowId = (row) => row.id,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const isAllSelected = data?.length > 0 && selectedIds.length === data.length;

  const toggleSelectAll = () => {
    const newSelection = isAllSelected ? [] : data.map(getRowId);
    setSelectedIds(newSelection);
    // Seçim değiştiğinde herhangi bir olay tetiklenmesine gerek yok!
  };

  const toggleSelectRow = (id) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    setSelectedIds(newSelection);
  };

  // const getSelectedRows = () => {}

  const allColumns = [
    {
      id: "select",
      title: "",
      span: 1,
      headerRender: () => {
        return (
          <div
            onClick={toggleSelectAll}
            className="cursor-pointer hover:text-halo-600 transition-colors"
          >
            {isAllSelected ? (
              <CheckSquare className="w-6 h-6 text-halo-600" />
            ) : (
              <Square className="w-6 h-6 text-text-muted" />
            )}
          </div>
        );
      },
      cellRender: (row) => {
        const rowId = getRowId(row);
        const isSelected = selectedIds.includes(rowId);
        return (
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectRow(rowId);
            }}
          >
            {isSelected ? (
              <CheckSquare className="w-6 h-6 text-halo-600 cursor-pointer" />
            ) : (
              <Square className="w-6 h-6 text-text-muted cursor-pointer hover:text-halo-600 transition-colors" />
            )}
          </div>
        );
      },
    },
    ...columns,
  ];

  const finalColumns =
    rowActions && rowActions.length > 0
      ? [
        ...allColumns,
        {
          id: "actions",
          title: "",
          span: 1,
          align: "right",
          cellRender: (row) => (
            <div
              className="flex items-center justify-end px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-text-muted hover:text-text-main hover:bg-white/40 focus:bg-white/50 transition-all data-[state=open]:bg-white/50"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                {/* Menü İçeriği: Glass effect, yumuşak gölge ve border */}
                <DropdownMenuPortal>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 p-1 rounded-xl border border-white/20 bg-white/80 backdrop-blur-xl shadow-lg ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95"
                  >
                    {rowActions.map((action, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        onClick={(e) => action.onClick(row, e)}
                        className={cn(
                          "relative flex cursor-pointer select-none items-center rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors",
                          "hover:bg-halo-50 hover:text-halo-700 focus:bg-halo-50 focus:text-halo-700",
                          "text-text-main/80",
                          action.className // Eğer "Sil" butonu kırmızı olacaksa dışarıdan gelen class bunu ezer
                        )}
                      >
                        {action.icon && (
                          <span className="mr-2.5 text-text-muted group-hover:text-halo-600">
                            {React.cloneElement(action.icon, {
                              className: "w-4 h-4",
                            })}
                          </span>
                        )}
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </div>
          ),
        },
      ]
      : allColumns;

  return (
    <div className="glass overflow-hidden">
      {selectedIds.length > 0 && bulkActions ? (
        <div className="p-6 border-b border-white/20 bg-halo-50/10 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-halo-100/50 text-halo-600">
                <CheckSquare className="h-4 w-4" />
              </div>
              <span className="font-semibold text-text-main">
                {selectedIds.length} öğe seçildi
              </span>
            </div>

            <div className="flex gap-2">
              {bulkActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await action.onClick(selectedIds);
                    setSelectedIds([]);
                  }}
                  className={
                    action.danger
                      ? "text-red-500 hover:text-red-600 hover:bg-red-50/50 gap-2 transition-colors"
                      : "gap-2"
                  }
                >
                  {action.icon}
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-main">{title}</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-muted">
                {data?.length} öğe gösteriliyor
              </span>
              {headerActions}
            </div>
          </div>
        </div>
      )}

      <CustomTableHeader columns={finalColumns} gridClassName={gridClassName} />

      <div className="divide-y divide-white/10">
        {data?.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            {emptyState || "Veri bulunamadı"}
          </div>
        ) : (
          data?.map((row, index) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.includes(rowId);
            const customClassName = rowClassName?.(row, index) || "";

            return (
              <CustomTableRow
                key={rowId}
                index={index}
                gridClassName={gridClassName}
                onClick={() => onRowClick?.(row)}
                className={`${isSelected ? "bg-halo-50/40" : ""
                  } ${customClassName}`}
              >
                {finalColumns.map((col) => (
                  <div
                    key={col.id}
                    className={`col-span-${col.span} flex items-center ${col.align === "center"
                        ? "justify-center"
                        : col.align === "right"
                          ? "justify-end"
                          : ""
                      }`}
                  >
                    {col.cellRender(row, index)}
                  </div>
                ))}
              </CustomTableRow>
            );
          })
        )}
      </div>

      {pagination && (
        <div className="flex items-center justify-between border-t border-white/20 px-6 py-4 bg-white/20">
          <div className="text-sm text-text-muted">
            Sayfa başına <strong>{pagination.itemsPerPage}</strong> öğe
            gösteriliyor
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="glass-hover border-white/60"
              disabled={pagination.currentPage === 1}
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
            >
              Önceki
            </Button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <Button
                  key={page}
                  variant="outline"
                  size="sm"
                  className={
                    page === pagination.currentPage
                      ? "glass-hover border-white/60 bg-gradient-to-r from-halo-600 to-halo-700 text-white border-transparent"
                      : "glass-hover border-white/60"
                  }
                  onClick={() => pagination.onPageChange(page)}
                >
                  {page}
                </Button>
              )
            )}

            <Button
              variant="outline"
              size="sm"
              className="glass-hover border-white/60"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
