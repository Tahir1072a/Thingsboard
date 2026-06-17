"use client";

/**
 * BaseWidgetCard — Tüm widget'lar için evrensel wrapper bileşeni
 *
 * Glassmorphism estetik, Framer Motion giriş animasyonu,
 * Edit Mode'da kesikli border + drag handle + delete butonu.
 */

import { motion } from "framer-motion";
import { GripVertical, Trash2 } from "lucide-react";

export default function BaseWidgetCard({
  title,
  isEditMode = false,
  isLive,
  onDelete,
  children,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        flex flex-col h-full overflow-hidden transition-all duration-200
        ${isEditMode
          ? "bg-white/85 backdrop-blur-xl rounded-2xl border-2 border-dashed border-halo-400/50 shadow-md"
          : "bg-white/80 backdrop-blur-lg rounded-2xl border border-white/30 shadow-sm"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isEditMode && (
            <div className="widget-drag-handle cursor-grab active:cursor-grabbing flex items-center gap-1 p-1 rounded-md hover:bg-halo-50 transition-colors">
              <GripVertical className="h-4 w-4 text-halo-400" />
            </div>
          )}
          <h3 className="text-sm font-semibold text-text-main truncate">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* LIVE göstergesi */}
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          )}

          {/* Sil butonu (sadece edit mode) */}
          {isEditMode && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-4 pb-3 pt-1">
        {children}
      </div>
    </motion.div>
  );
}
