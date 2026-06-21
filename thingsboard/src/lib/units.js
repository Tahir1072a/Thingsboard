/**
 * Birim Tablosu — Evrensel birim tanımları
 *
 * Widget'larda birim seçimi için kullanılır.
 * Kategorize edilmiş, aranabilir bir dropdown oluşturmak için `UNIT_CATEGORIES` kullanın.
 *
 * Kullanım:
 *   import { UNIT_CATEGORIES, getUnitSymbol, FLAT_UNITS } from "@/lib/units";
 *   const symbol = getUnitSymbol("celsius"); // → "°C"
 */

export const UNIT_CATEGORIES = [
  {
    category: "Sıcaklık",
    units: [
      { symbol: "°C", label: "Santigrat", key: "celsius" },
      { symbol: "°F", label: "Fahrenheit", key: "fahrenheit" },
      { symbol: "K", label: "Kelvin", key: "kelvin" },
    ],
  },
  {
    category: "Nem",
    units: [
      { symbol: "%RH", label: "Bağıl Nem", key: "rh" },
      { symbol: "g/m³", label: "Mutlak Nem", key: "abs_humidity" },
    ],
  },
  {
    category: "Basınç",
    units: [
      { symbol: "hPa", label: "Hektopascal", key: "hpa" },
      { symbol: "Pa", label: "Pascal", key: "pascal" },
      { symbol: "bar", label: "Bar", key: "bar" },
      { symbol: "mbar", label: "Milibar", key: "mbar" },
      { symbol: "psi", label: "PSI", key: "psi" },
      { symbol: "atm", label: "Atmosfer", key: "atm" },
      { symbol: "mmHg", label: "Milimetre Cıva", key: "mmhg" },
    ],
  },
  {
    category: "Uzunluk / Mesafe",
    units: [
      { symbol: "mm", label: "Milimetre", key: "mm" },
      { symbol: "cm", label: "Santimetre", key: "cm" },
      { symbol: "m", label: "Metre", key: "meter" },
      { symbol: "km", label: "Kilometre", key: "km" },
      { symbol: "in", label: "İnç", key: "inch" },
      { symbol: "ft", label: "Feet", key: "feet" },
    ],
  },
  {
    category: "Ağırlık / Kütle",
    units: [
      { symbol: "mg", label: "Miligram", key: "mg" },
      { symbol: "g", label: "Gram", key: "gram" },
      { symbol: "kg", label: "Kilogram", key: "kg" },
      { symbol: "ton", label: "Ton", key: "ton" },
      { symbol: "lb", label: "Pound", key: "lb" },
      { symbol: "oz", label: "Ounce", key: "oz" },
    ],
  },
  {
    category: "Hız",
    units: [
      { symbol: "m/s", label: "Metre/Saniye", key: "mps" },
      { symbol: "km/h", label: "Kilometre/Saat", key: "kmh" },
      { symbol: "mph", label: "Mil/Saat", key: "mph" },
      { symbol: "knot", label: "Knot", key: "knot" },
    ],
  },
  {
    category: "Elektrik",
    units: [
      { symbol: "V", label: "Volt", key: "volt" },
      { symbol: "mV", label: "Milivolt", key: "millivolt" },
      { symbol: "A", label: "Amper", key: "ampere" },
      { symbol: "mA", label: "Miliamper", key: "milliampere" },
      { symbol: "W", label: "Watt", key: "watt" },
      { symbol: "kW", label: "Kilowatt", key: "kilowatt" },
      { symbol: "kWh", label: "Kilowatt-saat", key: "kwh" },
      { symbol: "Ω", label: "Ohm", key: "ohm" },
      { symbol: "Hz", label: "Hertz", key: "hertz" },
    ],
  },
  {
    category: "Işık",
    units: [
      { symbol: "lux", label: "Lüks", key: "lux" },
      { symbol: "lm", label: "Lümen", key: "lumen" },
      { symbol: "cd", label: "Kandela", key: "candela" },
    ],
  },
  {
    category: "Ses",
    units: [
      { symbol: "dB", label: "Desibel", key: "db" },
      { symbol: "dBA", label: "Desibel (A-ağırlıklı)", key: "dba" },
    ],
  },
  {
    category: "Akış",
    units: [
      { symbol: "L/min", label: "Litre/Dakika", key: "lpm" },
      { symbol: "m³/h", label: "Metreküp/Saat", key: "m3h" },
      { symbol: "GPM", label: "Galon/Dakika", key: "gpm" },
    ],
  },
  {
    category: "Açı",
    units: [
      { symbol: "°", label: "Derece", key: "degree" },
      { symbol: "rad", label: "Radyan", key: "radian" },
    ],
  },
  {
    category: "Frekans",
    units: [
      { symbol: "Hz", label: "Hertz", key: "hz" },
      { symbol: "kHz", label: "Kilohertz", key: "khz" },
      { symbol: "MHz", label: "Megahertz", key: "mhz" },
      { symbol: "GHz", label: "Gigahertz", key: "ghz" },
      { symbol: "RPM", label: "Devir/Dakika", key: "rpm" },
    ],
  },
  {
    category: "Zaman",
    units: [
      { symbol: "ms", label: "Milisaniye", key: "millisecond" },
      { symbol: "s", label: "Saniye", key: "second" },
      { symbol: "min", label: "Dakika", key: "minute" },
      { symbol: "h", label: "Saat", key: "hour" },
    ],
  },
  {
    category: "Yüzde / Oran",
    units: [
      { symbol: "%", label: "Yüzde", key: "percent" },
      { symbol: "ppm", label: "Milyonda Bir", key: "ppm" },
      { symbol: "ppb", label: "Milyarda Bir", key: "ppb" },
    ],
  },
  {
    category: "Hacim",
    units: [
      { symbol: "mL", label: "Mililitre", key: "ml" },
      { symbol: "L", label: "Litre", key: "liter" },
      { symbol: "m³", label: "Metreküp", key: "m3" },
      { symbol: "gal", label: "Galon", key: "gallon" },
    ],
  },
  {
    category: "Alan",
    units: [
      { symbol: "mm²", label: "Milimetrekare", key: "mm2" },
      { symbol: "cm²", label: "Santimetrekare", key: "cm2" },
      { symbol: "m²", label: "Metrekare", key: "m2" },
      { symbol: "km²", label: "Kilometrekare", key: "km2" },
      { symbol: "ha", label: "Hektar", key: "hectare" },
    ],
  },
  {
    category: "Veri",
    units: [
      { symbol: "B", label: "Byte", key: "byte" },
      { symbol: "KB", label: "Kilobyte", key: "kb" },
      { symbol: "MB", label: "Megabyte", key: "megabyte" },
      { symbol: "GB", label: "Gigabyte", key: "gb" },
      { symbol: "TB", label: "Terabyte", key: "tb" },
      { symbol: "bit", label: "Bit", key: "bit" },
      { symbol: "Kbps", label: "Kilobit/sn", key: "kbps" },
      { symbol: "Mbps", label: "Megabit/sn", key: "mbps" },
    ],
  },
  {
    category: "Diğer",
    units: [
      { symbol: "pH", label: "pH", key: "ph" },
      { symbol: "NTU", label: "Bulanıklık", key: "ntu" },
      { symbol: "µS/cm", label: "İletkenlik", key: "conductivity" },
      { symbol: "mg/L", label: "Çözünmüş Oksijen", key: "do" },
    ],
  },
];

/**
 * Tüm birimleri düz liste olarak al (arama için).
 * Her eleman: { key, symbol, label, category }
 */
export const FLAT_UNITS = UNIT_CATEGORIES.flatMap((cat) =>
  cat.units.map((u) => ({ ...u, category: cat.category }))
);

/**
 * Birim key'inden sembol getir.
 * @param {string} key - Birim key'i (ör: "celsius")
 * @returns {string} Sembol (ör: "°C") veya key'in kendisi
 */
export function getUnitSymbol(key) {
  if (!key) return "";
  const unit = FLAT_UNITS.find((u) => u.key === key);
  return unit ? unit.symbol : key; // Bulunamazsa key'i doğrudan döndür (geriye dönük uyumluluk)
}

/**
 * react-select için grouped options formatı.
 * @returns {Array} [{ label: "Sıcaklık", options: [{ value: "celsius", label: "°C — Santigrat" }] }]
 */
export function getGroupedUnitOptions() {
  return UNIT_CATEGORIES.map((cat) => ({
    label: cat.category,
    options: cat.units.map((u) => ({
      value: u.key,
      label: `${u.symbol} — ${u.label}`,
    })),
  }));
}
