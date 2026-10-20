const mongoose = require("mongoose");

// Security audit log - UC-VID-003 REQ-VID-PLAY-054 / A7.
// One document per refused playback attempt (anonymous user or not owner).
const securityEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g. "playback_denied"
    reason: { type: String, required: true }, // "anonymous" | "not_owner"
    userId: { type: String },
    videoId: { type: String },
    ip: { type: String },
    at: { type: Date, required: true, index: true },
  },
  { versionKey: false },
);

module.exports = mongoose.model("security_event", securityEventSchema);
