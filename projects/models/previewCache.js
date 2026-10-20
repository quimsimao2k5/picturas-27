const mongoose = require("mongoose");

const previewCacheSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    project_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    img_id: { type: mongoose.Schema.Types.ObjectId, required: true },

    cache_key: { type: String, required: true, index: true },
    img_sha256: { type: String, required: true, index: true },

    // guardamos keys (não URLs) porque URLs expiram
    image_key: { type: String, default: "" },
    text_keys: { type: [String], default: [] },

    // métricas básicas
    duration_ms: { type: Number, default: null },
    created_at: { type: Date, default: Date.now },
    last_hit_at: { type: Date, default: null },
    hits: { type: Number, default: 0 },
  },
  { versionKey: false }
);

previewCacheSchema.index({ user_id: 1, cache_key: 1 }, { unique: true });

module.exports = mongoose.model("preview_cache", previewCacheSchema);
