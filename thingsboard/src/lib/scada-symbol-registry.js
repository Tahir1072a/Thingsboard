/**
 * SCADA Sembol Registry
 *
 * ThingsBoard CE kaynaklı SVG sembollerini kategorize eden ve yöneten
 * merkezi kayıt dosyası. Her SVG dosyasında tb:metadata ve tb:tag
 * attribute'leri mevcuttur.
 *
 * SVG Yapısı:
 * - xmlns:tb="https://thingsboard.io/svg" namespace kullanılır
 * - <tb:metadata> elemanı JSON formatında metadata içerir
 * - tb:tag attribute'leri ile element'ler etiketlenir (background, clickArea, fluid, vb.)
 * - Her sembol kendi stateRenderFunction ve behavior tanımlarına sahiptir
 */

// ─────────────────────────────────────────────
// Kategori Tanımları
// ─────────────────────────────────────────────

export const SCADA_SYMBOL_CATEGORIES = [
  { id: 'all', label: 'Tümü', icon: 'LayoutGrid' },
  { id: 'tanks', label: 'Tanklar', icon: 'Container' },
  { id: 'pumps', label: 'Pompalar', icon: 'Fan' },
  { id: 'valves', label: 'Vanalar', icon: 'CircleDot' },
  { id: 'pipes', label: 'Borular', icon: 'Minus' },
  { id: 'motors', label: 'Motorlar', icon: 'Cog' },
  { id: 'sensors', label: 'Sensörler', icon: 'Thermometer' },
  { id: 'energy', label: 'Enerji', icon: 'Zap' },
  { id: 'other', label: 'Diğer', icon: 'Box' },
];

// ─────────────────────────────────────────────
// Sembol Tanımları
// ─────────────────────────────────────────────

export const SCADA_SYMBOLS = [
  // ═══════════════════════════════════════════
  // TANKLAR (4)
  // ═══════════════════════════════════════════
  {
    id: 'cylindrical-tank',
    name: 'Silindirik Tank',
    category: 'tanks',
    svgUrl: '/scada-symbols/cylindrical-tank.svg',
    defaultSize: { w: 3, h: 5 },
    viewBox: '0 0 600 1000',
    description: 'Anlık hacim değeri ve seviye görselleştirmeli silindirik tank',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'fluid', 'fluid-background', 'scale', 'scale-background', 'top-layer', 'value-box', 'value-box-background', 'value-text'],
    searchTags: ['tank'],
  },
  {
    id: 'conical-tank',
    name: 'Konik Tank',
    category: 'tanks',
    svgUrl: '/scada-symbols/conical-tank.svg',
    defaultSize: { w: 5, h: 5 },
    viewBox: '0 0 1000 1000',
    description: 'Anlık hacim değeri ve seviye görselleştirmeli konik tank',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'fluid', 'fluid-background', 'scale', 'scale-background', 'top-layer', 'value-box', 'value-box-background', 'value-text'],
    searchTags: ['conical tank', 'stand tank'],
  },
  {
    id: 'horizontal-tank',
    name: 'Yatay Tank',
    category: 'tanks',
    svgUrl: '/scada-symbols/horizontal-tank.svg',
    defaultSize: { w: 5, h: 3 },
    viewBox: '0 0 1000 600',
    description: 'Anlık hacim değeri ve seviye görselleştirmeli yatay tank',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'fluid', 'fluid-background', 'scale', 'scale-background', 'top-layer', 'value-box', 'value-box-background', 'value-text'],
    searchTags: ['tank'],
  },
  {
    id: 'spherical-tank',
    name: 'Küresel Tank',
    category: 'tanks',
    svgUrl: '/scada-symbols/spherical-tank.svg',
    defaultSize: { w: 5, h: 5 },
    viewBox: '0 0 1000 1000',
    description: 'Anlık hacim değeri ve seviye görselleştirmeli küresel tank',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'fluid', 'fluid-background', 'scale', 'scale-background', 'top-layer', 'value-box', 'value-box-background', 'value-text'],
    searchTags: ['tank', 'stand tank'],
  },

  // ═══════════════════════════════════════════
  // POMPALAR (3)
  // ═══════════════════════════════════════════
  {
    id: 'centrifugal-pump',
    name: 'Santrifüj Pompa',
    category: 'pumps',
    svgUrl: '/scada-symbols/centrifugal-pump.svg',
    defaultSize: { w: 2, h: 2 },
    viewBox: '0 0 400 400',
    description: 'Konfigüre edilebilir bağlantılar, çalışma animasyonu ve çeşitli durumlar ile santrifüj pompa',
    hasTbMetadata: true,
    tags: ['background', 'center', 'clickArea', 'leftBottomConnector', 'leftTopConnector', 'rightBottomConnector', 'rightTopConnector', 'topLeftConnector', 'topRightConnector'],
    searchTags: ['pump', 'centrifugal'],
  },
  {
    id: 'left-motor-pump',
    name: 'Sol Motor Pompa',
    category: 'pumps',
    svgUrl: '/scada-symbols/left-motor-pump.svg',
    defaultSize: { w: 4, h: 3 },
    viewBox: '0 0 800 600',
    description: 'Konfigüre edilebilir durumlarla sol motor pompa',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'center', 'label', 'value', 'units'],
    searchTags: ['motor', 'pump'],
  },
  {
    id: 'right-motor-pump',
    name: 'Sağ Motor Pompa',
    category: 'pumps',
    svgUrl: '/scada-symbols/right-motor-pump.svg',
    defaultSize: { w: 4, h: 3 },
    viewBox: '0 0 800 600',
    description: 'Konfigüre edilebilir durumlarla sağ motor pompa',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'center', 'label', 'value', 'units'],
    searchTags: ['motor', 'pump'],
  },

  // ═══════════════════════════════════════════
  // VANALAR (4)
  // ═══════════════════════════════════════════
  {
    id: 'horizontal-ball-valve',
    name: 'Yatay Küresel Vana',
    category: 'valves',
    svgUrl: '/scada-symbols/horizontal-ball-valve.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Açma/kapama animasyonu ve durum renkleriyle yatay küresel vana',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'wheel'],
    searchTags: ['valve', 'ball'],
  },
  {
    id: 'vertical-ball-valve',
    name: 'Dikey Küresel Vana',
    category: 'valves',
    svgUrl: '/scada-symbols/vertical-ball-valve.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Açma/kapama animasyonu ve durum renkleriyle dikey küresel vana',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'wheel'],
    searchTags: ['valve', 'ball'],
  },
  {
    id: 'horizontal-wheel-valve',
    name: 'Yatay Çark Vana',
    category: 'valves',
    svgUrl: '/scada-symbols/horizontal-wheel-valve.svg',
    defaultSize: { w: 2, h: 1 },
    viewBox: '0 0 400 200',
    description: 'Açma/kapama animasyonu ve durum renkleriyle yatay çark vana',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'wheel'],
    searchTags: ['valve', 'wheel'],
  },
  {
    id: 'waterstop',
    name: 'Su Kesme Vanası',
    category: 'valves',
    svgUrl: '/scada-symbols/waterstop.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Uzaktan kontrol edilebilir su kesme vanası, konfigüre edilebilir bağlantılar ve çeşitli durumlarla',
    hasTbMetadata: true,
    tags: ['clickArea', 'connector', 'background', 'wheel'],
    searchTags: ['water stop'],
  },

  // ═══════════════════════════════════════════
  // BORULAR (5)
  // ═══════════════════════════════════════════
  {
    id: 'horizontal-pipe',
    name: 'Yatay Boru',
    category: 'pipes',
    svgUrl: '/scada-symbols/horizontal-pipe.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Sıvı akış ve sızıntı görselleştirmeli yatay boru',
    hasTbMetadata: true,
    tags: ['fluid', 'fluid-background', 'leak', 'pipe-background'],
    searchTags: ['pipe', 'horizontal pipe'],
  },
  {
    id: 'vertical-pipe',
    name: 'Dikey Boru',
    category: 'pipes',
    svgUrl: '/scada-symbols/vertical-pipe.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Sıvı akış ve sızıntı görselleştirmeli dikey boru',
    hasTbMetadata: true,
    tags: ['fluid', 'fluid-background', 'leak', 'pipe-background'],
    searchTags: ['pipe', 'vertical pipe'],
  },
  {
    id: 'bottom-right-elbow-pipe',
    name: 'Alt Sağ Dirsek Boru',
    category: 'pipes',
    svgUrl: '/scada-symbols/bottom-right-elbow-pipe.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Sıvı akış ve sızıntı görselleştirmeli alt sağ dirsek boru',
    hasTbMetadata: true,
    tags: ['center-fluid-background', 'horizontal-fluid', 'vertical-fluid', 'leak', 'pipe-background'],
    searchTags: ['pipe', 'elbow'],
  },
  {
    id: 'bottom-tee-pipe',
    name: 'Alt T Boru',
    category: 'pipes',
    svgUrl: '/scada-symbols/bottom-tee-pipe.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Sol/sağ/alt sıvı akış ve sızıntı görselleştirmeli T boru bağlantısı',
    hasTbMetadata: true,
    tags: ['left-fluid', 'right-fluid', 'bottom-fluid', 'leak', 'pipe-background'],
    searchTags: ['pipe', 'tee'],
  },
  {
    id: 'cross-pipe',
    name: 'Çapraz Boru',
    category: 'pipes',
    svgUrl: '/scada-symbols/cross-pipe.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Sol/sağ/üst/alt sıvı akış ve sızıntı görselleştirmeli çapraz boru bağlantısı',
    hasTbMetadata: true,
    tags: ['left-fluid', 'right-fluid', 'top-fluid', 'bottom-fluid', 'leak', 'pipe-background'],
    searchTags: ['pipe', 'cross'],
  },

  // ═══════════════════════════════════════════
  // MOTORLAR (2)
  // ═══════════════════════════════════════════
  {
    id: 'electrical-engine-hp',
    name: 'Elektrik Motoru',
    category: 'motors',
    svgUrl: '/scada-symbols/electrical-engine-hp.svg',
    defaultSize: { w: 3, h: 2 },
    viewBox: '0 0 600 400',
    description: 'Çeşitli durum gösterimleri ile elektrik motoru',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'label', 'value', 'units', 'critical', 'warning'],
    searchTags: ['extraction', 'power'],
  },
  {
    id: 'turbine-hp',
    name: 'Türbin',
    category: 'motors',
    svgUrl: '/scada-symbols/turbine-hp.svg',
    defaultSize: { w: 4, h: 2 },
    viewBox: '0 0 800 400',
    description: 'Çeşitli durum gösterimleri ile türbin',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'label', 'value', 'units', 'critical', 'warning'],
    searchTags: ['extraction'],
  },

  // ═══════════════════════════════════════════
  // SENSÖRLER / ÖLÇÜM (4)
  // ═══════════════════════════════════════════
  {
    id: 'leak-sensor',
    name: 'Sızıntı Sensörü',
    category: 'sensors',
    svgUrl: '/scada-symbols/leak-sensor.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 100 100',
    description: 'Sıvı sızıntısının gerçek zamanlı algılama ve uyarı sensörü',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'icon'],
    searchTags: ['leak'],
  },
  {
    id: 'meter',
    name: 'Ölçüm Göstergesi',
    category: 'sensors',
    svgUrl: '/scada-symbols/meter.svg',
    defaultSize: { w: 1, h: 4 },
    viewBox: '0 0 100 400',
    description: 'Ölçek üzerinde hareketli ibre ile anlık değer gösteren ölçüm cihazı',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'pointer', 'scale', 'value'],
    searchTags: ['scale', 'level', 'progress', 'thermometer'],
  },
  {
    id: 'horizontal-inline-flow-meter',
    name: 'Yatay Hat İçi Akış Ölçer',
    category: 'sensors',
    svgUrl: '/scada-symbols/horizontal-inline-flow-meter.svg',
    defaultSize: { w: 2, h: 1 },
    viewBox: '0 0 400 200',
    description: 'Akış değeri ve çeşitli durumları gösteren hat içi akış ölçer. Boru sıvı ve sızıntı görselleştirmesi dahil.',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'fluid', 'fluid-background', 'leak', 'pipe-background', 'value', 'units', 'label'],
    searchTags: ['meter', 'flow meter'],
  },
  {
    id: 'bottom-flow-meter',
    name: 'Alt Akış Ölçer',
    category: 'sensors',
    svgUrl: '/scada-symbols/bottom-flow-meter.svg',
    defaultSize: { w: 2, h: 2 },
    viewBox: '0 0 400 400',
    description: 'Akış değeri ve çeşitli durumları gösteren alt akış ölçer. Boru sıvı ve sızıntı görselleştirmesi dahil.',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'fluid', 'fluid-background', 'leak', 'pipe-background', 'value', 'units', 'label'],
    searchTags: ['meter', 'flow meter'],
  },

  // ═══════════════════════════════════════════
  // ENERJİ (3)
  // ═══════════════════════════════════════════
  {
    id: 'energy-meter-hp',
    name: 'Enerji Sayacı',
    category: 'energy',
    svgUrl: '/scada-symbols/energy-meter-hp.svg',
    defaultSize: { w: 2, h: 2 },
    viewBox: '0 0 400 400',
    description: 'Çeşitli durum gösterimleri ile enerji sayacı',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'critical', 'label', 'units', 'value', 'value-box', 'warning'],
    searchTags: ['power', 'energy'],
  },
  {
    id: 'solar-panel-hp',
    name: 'Güneş Paneli',
    category: 'energy',
    svgUrl: '/scada-symbols/solar-panel-hp.svg',
    defaultSize: { w: 1, h: 2 },
    viewBox: '0 0 200 400',
    description: 'Çeşitli durum gösterimleri ile güneş paneli',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'label', 'value', 'units', 'critical', 'warning'],
    searchTags: ['energy', 'power', 'renewable', 'generation'],
  },
  {
    id: 'wind-turbine-hp',
    name: 'Rüzgâr Türbini',
    category: 'energy',
    svgUrl: '/scada-symbols/wind-turbine-hp.svg',
    defaultSize: { w: 3, h: 4 },
    viewBox: '0 0 600 800',
    description: 'Çeşitli durum gösterimleri ile rüzgâr türbini',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'label', 'value', 'units', 'critical', 'warning'],
    searchTags: ['energy', 'power', 'renewable', 'generation'],
  },

  // ═══════════════════════════════════════════
  // DİĞER (3)
  // ═══════════════════════════════════════════
  {
    id: 'single-key-switch-hp',
    name: 'Tek Tuşlu Anahtar',
    category: 'other',
    svgUrl: '/scada-symbols/single-key-switch-hp.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Çeşitli durum gösterimleri ile tek tuşlu anahtar',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'label', 'value', 'critical', 'warning'],
    searchTags: ['energy', 'power'],
  },
  {
    id: 'bottom-light-bulb-hp',
    name: 'Alt Işık Ampulü',
    category: 'other',
    svgUrl: '/scada-symbols/bottom-light-bulb-hp.svg',
    defaultSize: { w: 1, h: 1 },
    viewBox: '0 0 200 200',
    description: 'Çeşitli durum gösterimleri ile alt konumlu ışık ampulü',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'label', 'value', 'critical', 'warning'],
    searchTags: ['energy'],
  },
  {
    id: 'sand-filter',
    name: 'Kum Filtresi',
    category: 'other',
    svgUrl: '/scada-symbols/sand-filter.svg',
    defaultSize: { w: 3, h: 5 },
    viewBox: '0 0 600 1000',
    description: 'Konfigüre edilebilir filtrasyon modu ve çeşitli durumlarla kum filtresi',
    hasTbMetadata: true,
    tags: ['background', 'clickArea', 'filter-mode', 'label', 'value', 'units'],
    searchTags: ['filter', 'sand'],
  },
];

// ─────────────────────────────────────────────
// Yardımcı Fonksiyonlar
// ─────────────────────────────────────────────

/**
 * Belirtilen kategoriye ait sembolleri döndürür.
 * @param {string} categoryId - Kategori ID'si ('all' veya undefined tüm sembolleri döndürür)
 * @returns {Array} Sembol listesi
 */
export function getSymbolsByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return SCADA_SYMBOLS;
  return SCADA_SYMBOLS.filter((s) => s.category === categoryId);
}

/**
 * Belirtilen ID'ye sahip sembolü döndürür.
 * @param {string} symbolId - Sembol ID'si
 * @returns {Object|undefined} Sembol nesnesi veya bulunamazsa undefined
 */
export function getSymbolById(symbolId) {
  return SCADA_SYMBOLS.find((s) => s.id === symbolId);
}

/**
 * Arama metnine göre sembolleri filtreler (isim, açıklama ve searchTags'de arar).
 * @param {string} query - Arama metni
 * @returns {Array} Eşleşen sembol listesi
 */
export function searchSymbols(query) {
  if (!query) return SCADA_SYMBOLS;
  const q = query.toLowerCase();
  return SCADA_SYMBOLS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.searchTags.some((tag) => tag.toLowerCase().includes(q))
  );
}

/**
 * Belirtilen tb:tag'e sahip tüm sembolleri döndürür.
 * @param {string} tagName - tb:tag adı (örn: 'fluid', 'clickArea')
 * @returns {Array} Eşleşen sembol listesi
 */
export function getSymbolsByTag(tagName) {
  if (!tagName) return [];
  return SCADA_SYMBOLS.filter((s) => s.tags && s.tags.includes(tagName));
}

/**
 * Kategorilere göre sembol sayılarını döndürür.
 * @returns {Object} Kategori ID'lerine göre sembol sayıları
 */
export function getSymbolCountByCategory() {
  const counts = { all: SCADA_SYMBOLS.length };
  SCADA_SYMBOL_CATEGORIES.forEach((cat) => {
    if (cat.id !== 'all') {
      counts[cat.id] = SCADA_SYMBOLS.filter((s) => s.category === cat.id).length;
    }
  });
  return counts;
}
