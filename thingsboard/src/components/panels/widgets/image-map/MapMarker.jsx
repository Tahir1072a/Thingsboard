import { useState, useCallback, useRef } from "react";
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
  imageRenderArea,
  onDragEnd,
  onRemove,
  markerSize = 24,
  markerColor = "#6366f1",
  showTooltips = true,
  showValueLabel = false,
}) {
  const [hovered, setHovered] = useState(false);

  const Icon = ICON_MAP[marker.iconType] || CircleDot;

  /* ── Drag başlangıcında pointer-marker offset'ini kaydet ── */
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback(
    (event) => {
      if (!containerRef?.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (imageRenderArea) {
        // Resme göre marker merkezi (viewport koordinatları)
        const { renderW, renderH, offsetX, offsetY } = imageRenderArea;
        const markerCenterX = rect.left + offsetX + (marker.xPos / 100) * renderW;
        const markerCenterY = rect.top + offsetY + (marker.yPos / 100) * renderH;
        dragStartOffset.current = {
          x: event.clientX - markerCenterX,
          y: event.clientY - markerCenterY,
        };
      } else {
        const markerCenterX = rect.left + (marker.xPos / 100) * rect.width;
        const markerCenterY = rect.top + (marker.yPos / 100) * rect.height;
        dragStartOffset.current = {
          x: event.clientX - markerCenterX,
          y: event.clientY - markerCenterY,
        };
      }
    },
    [containerRef, marker.xPos, marker.yPos, imageRenderArea]
  );

  /* ── Drag bittiğinde yeni yüzdesel pozisyonu hesapla ── */
  const handleDragEnd = useCallback(
    (_event, info) => {
      if (!containerRef?.current || !onDragEnd) return;

      const rect = containerRef.current.getBoundingClientRect();

      // Pointer pozisyonundan başlangıç offset'ini çıkar → gerçek merkez
      const correctedX = info.point.x - dragStartOffset.current.x;
      const correctedY = info.point.y - dragStartOffset.current.y;

      let rawX, rawY;

      if (imageRenderArea) {
        // Resmin gerçek render alanına göre % hesapla
        const { renderW, renderH, offsetX, offsetY } = imageRenderArea;
        rawX = ((correctedX - rect.left - offsetX) / renderW) * 100;
        rawY = ((correctedY - rect.top - offsetY) / renderH) * 100;
      } else {
        rawX = ((correctedX - rect.left) / rect.width) * 100;
        rawY = ((correctedY - rect.top) / rect.height) * 100;
      }

      // Sınırları 0-100 arasında tut
      const xPos = Math.max(0, Math.min(100, rawX));
      const yPos = Math.max(0, Math.min(100, rawY));

      onDragEnd(marker.id, xPos, yPos);
    },
    [containerRef, onDragEnd, marker.id, imageRenderArea]
  );

  /* ── Alert pulse animasyonu ── */
  const pulseAnimation = isAlert
    ? { scale: [1, 1.2, 1] }
    : { scale: 1 };

  const pulseTransition = isAlert
    ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
    : {};

  /* ── Marker pozisyon hesaplama (resme göre) ── */
  const markerStyle = (() => {
    if (imageRenderArea) {
      const { renderW, renderH, offsetX, offsetY } = imageRenderArea;
      return {
        left: `${offsetX + (marker.xPos / 100) * renderW}px`,
        top: `${offsetY + (marker.yPos / 100) * renderH}px`,
        transform: "translate(-50%, -50%)",
      };
    }
    return {
      left: `${marker.xPos}%`,
      top: `${marker.yPos}%`,
      transform: "translate(-50%, -50%)",
    };
  })();

  return (
    <motion.div
      className="absolute z-10 cancel"
      style={markerStyle}
      /* ── Drag (sadece edit modda) ── */
      drag={isEditMode}
      dragConstraints={containerRef}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={isEditMode ? handleDragStart : undefined}
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
