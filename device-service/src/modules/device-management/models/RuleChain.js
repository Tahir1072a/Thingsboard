import mongoose, { connections } from "mongoose";

const ruleChainSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true },

    firstNodeIndex: { type: Number, default: 0 },

    nodes: [
      {
        // Node'un UI'daki adı (Örn: "Sıcaklık Kontrolü")
        name: { type: String },

        // Örn: 'SAVE_DB', 'FILTER_SCRIPT', 'SEND_EMAIL'
        type: { type: String, required: true },

        // Filter node için script, Email node için adres vb.
        configuration: { type: Object },
        uiPosition: { x: Number, y: Number },
      },
    ],

    connections: [
      {
        fromIndex: { type: Number, required: true },
        toIndex: { type: Number, required: true },
        type: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

ruleChainSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.models.RuleChain ||
  mongoose.model("RuleChain", ruleChainSchema);
