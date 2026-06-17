"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Edit3, X } from "lucide-react";

export default function CommonEntitySheet({
  open,
  onOpenChange,
  title,
  subtitle,
  icon: Icon,
  isEditing,
  onEditToggle,
  tabs = [],
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "details");

  // Tabs değişirse (örn farklı entity açılırsa) ilk taba dön
  useEffect(() => {
    if (tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="glass-strong sheet-animations border-l border-white/20 w-full sm:max-w-[1100px] p-0 overflow-hidden fixed right-0 top-0 h-full outline-none shadow-2xl">
        <div className="h-full flex flex-col">
          {/* --- HEADER --- */}
          <SheetHeader className="px-6 py-5 bg-gradient-to-r from-halo-500 to-halo-600 border-b border-white/20 shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-3 text-2xl text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                  {Icon && <Icon className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <div className="font-bold tracking-tight">{title}</div>
                  <div className="text-sm font-normal text-white/80 mt-1">
                    {subtitle}
                  </div>
                </div>
              </SheetTitle>

              <Button
                onClick={onEditToggle}
                variant={isEditing ? "secondary" : "default"}
                className={`bg-white/20 hover:bg-white/30 text-white border border-white/40 cursor-pointer backdrop-blur-sm transition-all ${
                  isEditing
                    ? "bg-red-500/20 border-red-200/50 hover:bg-red-500/30"
                    : ""
                }`}
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-2" /> İptal
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-2" /> Hızlı Düzenle
                  </>
                )}
              </Button>
            </div>
          </SheetHeader>

          {/* --- DİNAMİK TABS --- */}
          <div className="flex-1 overflow-hidden bg-app-gradient flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              {/* Tab Menüsü Listesi */}
              <TabsList className="w-full justify-start rounded-none bg-white/50 border-b border-white/20 px-6 gap-2 h-auto py-3 overflow-x-auto flex-nowrap">
                {tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="cursor-pointer whitespace-nowrap px-4 py-2 rounded-md transition-all
                              text-gray-500 hover:text-gray-900 hover:bg-white/40
                              data-[state=active]:bg-halo-600 
                              data-[state=active]:text-white 
                              data-[state=active]:shadow-md"
                    >
                      <TabIcon className="h-4 w-4 mr-2" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {tabs.map((tab) => (
                  <TabsContent
                    key={tab.id}
                    value={tab.id}
                    className="m-0 h-full"
                  >
                    {tab.content}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
