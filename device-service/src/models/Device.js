import mongoose, { Schema } from "mongoose";

const deviceSchema = mongoose.Schema(
  {
    tenant: { type: String, required: true, index: true },
    customerId: { type: String, default: null, index: true },

    name: { type: String, required: true },
    profile: { type: String, default: "default" }, // İleride ObjectId olacak
    tag: { type: String }, // 'label' yerine 'tag' kullanıyoruz
    description: { type: String },

    // Status (Aktif/Pasif)
    active: { type: Boolean, default: false },

    // Access Token (Unique Index)
    accessToken: { type: String, required: true, unique: true, index: true },

    // Yönetici notları (Sadece Admin yazar)
    serverAttributes: { type: Map, of: Schema.Types.Mixed, default: {} },
    // Cihaz ayarları (Admin yazar -> Cihaz okur)
    sharedAttributes: { type: Map, of: Schema.Types.Mixed, default: {} },
    // Cihaz verileri (Cihaz yazar -> Admin okur) - FR-DEV-16 ile dolar
    clientAttributes: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Tenant içinde isim benzersizliği
deviceSchema.index({ tenant: 1, name: 1 }, { unique: true });

export default mongoose.models.Device || mongoose.model("Device", deviceSchema);
