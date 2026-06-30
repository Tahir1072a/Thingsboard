import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Zap,
  Wifi,
  Camera,
  AlertTriangle,
  Activity,
  Sun,
  Fan,
  X,
} from "lucide-react";

/* ── Icon type → Lucide component mapping ── */
export const MARKER_ICONS = {
  pin: MapPin,
  thermometer: Thermometer,
  droplets: Droplets,
  wind: Wind,
  gauge: Gauge,
  zap: Zap,
  wifi: Wifi,
  camera: Camera,
  alert: AlertTriangle,
  activity: Activity,
  sun: Sun,
  fan: Fan,
};

/* Eski ikon isimlerini de geriye dönük destekle */
const LEGACY_ICON_MAP = {
  thermostat: Thermometer,
  light: Zap,
  sensor: Activity,
  generic: MapPin,
};

function resolveIcon(iconType) {
  return MARKER_ICONS[iconType] || LEGACY_ICON_MAP[iconType] || MapPin;
}

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
  onDelete,
  markerSize: globalMarkerSize = 24,
  markerColor: globalMarkerColor = "#6366f1",
  showTooltips = true,
  showValueLabel = false,
}) {
  const [hovered, setHovered] = useState(false);
  /* Drag sonrası framer-motion iç state'ini sıfırlamak için update counter */
  const [dragResetKey, setDragResetKey] = useState(0);

  /* Per-marker veya global değerler */
  const markerSize = marker.size || globalMarkerSize;
  const markerColor = marker.color || globalMarkerColor;
  const outerSize = markerSize * 1.5;

  const Icon = resolveIcon(marker.iconType);

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

      // Framer-motion iç transform state'ini sıfırla
      setDragResetKey((k) => k + 1);
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

  /* ── Marker pozisyon hesaplama (resme göre) ──
   * BUG FIX: CSS transform: translate(-50%, -50%) yerine margin kullanıyoruz
   * çünkü framer-motion drag sırasında kendi transform'unu override eder. */
  const markerStyle = (() => {
    if (imageRenderArea) {
      const { renderW, renderH, offsetX, offsetY } = imageRenderArea;
      return {
        left: `${offsetX + (marker.xPos / 100) * renderW}px`,
        top: `${offsetY + (marker.yPos / 100) * renderH}px`,
        marginLeft: -(outerSize / 2),
        marginTop: -(outerSize / 2),
      };
    }
    return {
      left: `${marker.xPos}%`,
      top: `${marker.yPos}%`,
      marginLeft: -(outerSize / 2),
      marginTop: -(outerSize / 2),
    };
  })();

  /* Silme callback'i — onDelete (yeni) veya onRemove (eski) */
  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      (onDelete || onRemove)?.(marker.id);
    },
    [onDelete, onRemove, marker.id]
  );

  return (
    <motion.div
      key={`${marker.id}_${dragResetKey}`}
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
          width: `${outerSize}px`,
          height: `${outerSize}px`,
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

      {/* ── Edit modda silme (×) butonu — hover'da görünür ── */}
      {isEditMode && hovered && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full
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
