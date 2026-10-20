const mongoose = require("mongoose");

const presetToolSchema = new mongoose.Schema(
  {
    procedure: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const presetShareSchema = new mongoose.Schema(
  {
    id: { type: String, default: null }, // uuid
    revoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const presetSchema = new mongoose.Schema(
  {
    owner_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    tools: { type: [presetToolSchema], default: [] },
    share: { type: presetShareSchema, default: () => ({}) },
  },
  { timestamps: true },
);

// evitar duplicações por user (nome único por owner)
presetSchema.index({ owner_id: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("preset", presetSchema);
