import mongoose, { Schema } from "mongoose";

/**
 * RuleChain — Kural Zinciri Modeli
 *
 * DAG (Directed Acyclic Graph) yapısında node'lar ve connection'lar içerir.
 * Her tenant'ın bir root rule chain'i olabilir.
 */
const RuleNodeSchema = new Schema(
  {
    nodeId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        // Filter
        "MSG_TYPE_FILTER",
        "SCRIPT_FILTER",
        "FIELD_CHECK",
        // Action
        "SAVE_TELEMETRY",
        "CREATE_ALARM",
        "CLEAR_ALARM",
        "SEND_EMAIL",
        "LOG",
        // Enrichment
        "DEVICE_ATTRIBUTES",
        "TENANT_ATTRIBUTES",
        // Transformation
        "SCRIPT_TRANSFORM",
        "RENAME_KEYS",
        // External
        "REST_API_CALL",
        "TELEGRAM",
        "MQTT_PUBLISH",
      ],
      required: true,
    },
    name: {
      type: String,
      required: true,
      default: "Node",
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // React Flow pozisyonu
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const RuleConnectionSchema = new Schema(
  {
    fromNodeId: { type: String, required: true },
    toNodeId: { type: String, required: true },
    relationType: {
      type: String,
      enum: ["SUCCESS", "FAILURE", "TRUE", "FALSE", "POST_TELEMETRY", "POST_ATTRIBUTES", "OTHER"],
      default: "SUCCESS",
    },
  },
  { _id: false }
);

const RuleChainSchema = new Schema(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Kural zinciri adı zorunludur."],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    isRoot: {
      type: Boolean,
      default: false,
    },

    nodes: [RuleNodeSchema],

    connections: [RuleConnectionSchema],

    // İlk node (giriş noktası)
    firstNodeId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

/* ------------------------------------------------------------------ */
/* İndeksler                                                            */
/* ------------------------------------------------------------------ */
RuleChainSchema.index({ tenantId: 1, isRoot: 1 });
RuleChainSchema.index({ tenantId: 1, name: 1 });

/* ------------------------------------------------------------------ */
/* Statics                                                              */
/* ------------------------------------------------------------------ */

/**
 * Tenant'ın root rule chain'ini getir.
 */
RuleChainSchema.statics.getRootChain = function (tenantId) {
  return this.findOne({ tenantId, isRoot: true }).lean();
};

/* ------------------------------------------------------------------ */
/* Virtuals                                                             */
/* ------------------------------------------------------------------ */
RuleChainSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */
const RuleChain =
  mongoose.models.RuleChain || mongoose.model("RuleChain", RuleChainSchema);

export default RuleChain;
