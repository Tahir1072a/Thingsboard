import mongoose, { Schema } from "mongoose";

/**
 * Dashboard (Pano) Modeli
 *
 * Kullanıcı tarafından oluşturulan panoları ve içlerindeki
 * widget konfigürasyonlarını saklar.
 */

const WidgetSchema = new Schema(
  {
    // react-grid-layout benzersiz ID
    i: { type: String, required: true },

    // Widget tipi
    type: {
      type: String,
      enum: [
        "line_chart", "gauge", "value_card", "table", "image_map",
        "bar_chart", "pie_chart", "stat_card", "alarm_list", "geo_map",
        "rpc_switch", "rpc_slider", "rpc_button",
        "scada_valve", "scada_pump", "scada_tank", "scada_pipe",
        "scada_motor", "scada_sensor", "scada_gauge", "scada_bar_gauge", "scada_symbol",
      ],
      required: true,
    },

    // Entity Alias referansı (yeni sistem)
    aliasId: { type: String, default: null },

    // Bağlı cihaz(lar) — alias yoksa fallback olarak kullanılır
    devices: [
      {
        id: { type: String, required: true },
        name: { type: String, default: "" },
        _id: false,
      },
    ],

    // Gösterilecek telemetri key'leri
    keys: [{ type: String }],

    // Widget başlığı
    title: { type: String, default: "Widget" },

    // Tipe özel ek ayarlar (min, max, maxPoints, timeRange vb.)
    config: { type: Schema.Types.Mixed, default: {} },

    // Grid pozisyonu (react-grid-layout)
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    w: { type: Number, default: 4 },
    h: { type: Number, default: 3 },
  },
  { _id: false }
);

const DashboardSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Pano adı zorunludur."],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Panoya sahip kullanıcı
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    // Widget konfigürasyonları
    widgets: [WidgetSchema],

    // ── Entity Alias Tanımları ──
    entityAliases: [
      {
        id: { type: String, required: true },
        aliasName: { type: String, required: true },
        type: {
          type: String,
          enum: [
            "SINGLE_DEVICE",
            "DEVICE_LIST",
            "ASSET_CHILDREN",
            "DEVICE_PROFILE",
            "ASSET_CHILDREN_BY_PROFILE",
          ],
          required: true,
        },
        config: { type: Schema.Types.Mixed, default: {} },
        _id: false,
      },
    ],

    // ── Dashboard States (sekmeler) ──
    states: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        widgets: [WidgetSchema],
        _id: false,
      },
    ],

    // ── Layout Ayarları ──
    layoutType: {
      type: String,
      enum: ["default", "scada"],
      default: "default",
    },
    /**
     * layoutConfig (Mixed):
     *   backgroundImage  : String (URL) — SCADA arka plan görseli
     *   backgroundSize   : 'contain' | 'cover' | 'auto' (default: 'cover')
     *   backgroundOpacity: Number 0-1 (default: 1)
     */
    layoutConfig: { type: Schema.Types.Mixed, default: {} },

    // ── Paylaşım ──
    isPublic: {
      type: Boolean,
      default: false,
    },

    // Public erişim token'ı (URL'de kullanılır)
    publicToken: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },

    shareSettings: {
      expiresAt: { type: Date, default: null },
      embedEnabled: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

DashboardSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

DashboardSchema.index({ tenantId: 1, createdAt: -1 });

// Fix: Eski non-sparse publicToken index'ini kaldır (E11000 duplicate key hatası)
DashboardSchema.statics.fixPublicTokenIndex = async function () {
  try {
    const indexes = await this.collection.indexes();
    const ptIndex = indexes.find(
      (idx) => idx.key?.publicToken && idx.unique && !idx.sparse
    );
    if (ptIndex) {
      await this.collection.dropIndex(ptIndex.name);
      // Mongoose ensureIndexes sparse index'i yeniden oluşturacak
    }
  } catch {
    // Index yoksa veya zaten düzeltilmişse yoksay
  }
};

const Dashboard =
  mongoose.models.Dashboard || mongoose.model("Dashboard", DashboardSchema);

// Uygulama başlatılırken index'i düzelt
Dashboard.fixPublicTokenIndex().catch(() => {});

export default Dashboard;
