const mongoose = require("mongoose");

// Active playback ("stream") of a video - UC-VID-003 RN6.
// A session counts for the profile limit while lastSeenAt is recent
// (heartbeat); old documents are garbage-collected by the TTL index.
const playbackSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    videoId: { type: String, required: true },
    clientId: { type: String, index: true }, // browser identifier (REQ-VID-PLAY-056)
    lastSeenAt: { type: Date, required: true, index: { expireAfterSeconds: 3600 } },
  },
  { timestamps: true },
);

module.exports = mongoose.model("playback_session", playbackSessionSchema);
