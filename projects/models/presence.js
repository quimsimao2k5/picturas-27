const mongoose = require("mongoose");

const PresenceSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    // “batimento” para saber se está ativo
    lastSeenAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

// 1 presença por user/projeto
PresenceSchema.index({ ownerId: 1, projectId: 1, userId: 1 }, { unique: true });

// TTL: apaga documentos com lastSeenAt “antigo”
// Ex.: 45s de tolerância (ajustar)
PresenceSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 45 });

module.exports = mongoose.model("Presence", PresenceSchema);
