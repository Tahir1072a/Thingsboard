"use client";

/**
 * MapMarker — Kat planı üzerinde tek bir cihaz marker'ı
 *
 * Hover'da tooltip gösterir (cihaz adı + değer + birim).
 * Edit modda sürüklenebilir (drag) ve kaldırılabilir (remove).
 * Alert durumunda pulse animasyonu oynar.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Thermometer,
  Lightbulb,
  Camera,
  Activity,
  CircleDot,
  X,
} from "lucide-react";

/* ── Icon type → Lucide component mapping ── */
const ICON_MAP = {
  thermostat: Thermometer,
  light: Lightbulb,
  camera: Camera,
  sensor: Activity,
  generic: CircleDot,
};

export default function MapMarker({
  marker,
  value,
  unit = "",
  isEditMode = false,
  isAlert = false,
  containerRef,
  onDragEnd,
  onRemove,
  markerSize = 24,
  markerColor = "#6366f1",
  showTooltips = true,
  showValueLabel = false,
}) {
  const [hovered, setHovered] = useState(false);

  const Icon = ICON_MAP[marker.iconType] || CircleDot;

  /* ── Drag bittiğinde yeni yüzdesel pozisyonu hesapla ── */
  const handleDragEnd = useCallback(
    (_event, info) => {
      if (!containerRef?.current || !onDragEnd) return;

      const rect = containerRef.current.getBoundingClientRect();

      // info.point: viewport koordinatları
      const rawX = ((info.point.x - rect.left) / rect.width) * 100;
      const rawY = ((info.point.y - rect.top) / rect.height) * 100;

      // Sınırları 0-100 arasında tut
      const xPos = Math.max(0, Math.min(100, rawX));
      const yPos = Math.max(0, Math.min(100, rawY));

      onDragEnd(marker.id, xPos, yPos);
    },
    [containerRef, onDragEnd, marker.id]
  );

  /* ── Alert pulse animasyonu ── */
  const pulseAnimation = isAlert
    ? { scale: [1, 1.2, 1] }
    : { scale: 1 };

  const pulseTransition = isAlert
    ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
    : {};

  return (
    <motion.div
      className="absolute z-10 cancel"
      style={{
        left: `${marker.xPos}%`,
        top: `${marker.yPos}%`,
        transform: "translate(-50%, -50%)",
      }}
      /* ── Drag (sadece edit modda) ── */
      drag={isEditMode}
      dragConstraints={containerRef}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={isEditMode ? handleDragEnd : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      /* ── Hover olayları ── */
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Tooltip ── */}
      <AnimatePresence>
        {showTooltips && hovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: -5 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
              bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs
              font-medium shadow-xl whitespace-nowrap pointer-events-none"
          >
            {marker.deviceName}: {value ?? "—"}
            {unit && ` ${unit}`}
            {/* Küçük ok (caret) */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pin gövdesi ── */}
      <motion.div
        animate={pulseAnimation}
        transition={pulseTransition}
        className={`
          relative flex items-center justify-center
          rounded-full
          bg-white shadow-md border-2
          ${isAlert ? "border-red-400 shadow-red-200" : "shadow-halo-200/30"}
          ${isEditMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
          transition-colors duration-200
        `}
        style={{
          width: `${markerSize * 1.5}px`,
          height: `${markerSize * 1.5}px`,
          borderColor: isAlert ? undefined : markerColor,
        }}
      >
        <Icon
          className={`${isAlert ? "text-red-500" : ""}`}
          style={{
            width: `${markerSize * 0.67}px`,
            height: `${markerSize * 0.67}px`,
            color: isAlert ? undefined : markerColor,
          }}
        />
      </motion.div>

      {/* ── Value label (altında sabit metin) ── */}
      {showValueLabel && value != null && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap pointer-events-none">
          <span className="text-[10px] font-bold text-slate-700 bg-white/90 px-1.5 py-0.5 rounded shadow-sm border border-slate-200/60">
            {value}{unit && ` ${unit}`}
          </span>
        </div>
      )}

      {/* ── Edit modda kaldırma (X) butonu ── */}
      {isEditMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(marker.id);
          }}
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full
            bg-red-500 text-white flex items-center justify-center
            shadow-md hover:bg-red-600 transition-colors z-20"
          title="Sil"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}
