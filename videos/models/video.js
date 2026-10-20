const mongoose = require("mongoose");
const { VIDEO_STATUS } = require("../utils/status");

// Video record of the library (UC-VID-002). One document per submitted video;
// the record is created in step 4 with status "uploading" (RN7).
const videoSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true }, // RN2 / REQ-VID-LIB-025
    name: { type: String, required: true }, // original file name (RN9: duplicates allowed)
    format: { type: String, enum: ["mp4", "mov"], required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true }, // REQ-VID-LIB-024
    status: {
      type: String,
      enum: Object.values(VIDEO_STATUS),
      required: true,
      index: true,
    },
    rejection: {
      code: { type: String },
      details: { type: mongoose.Schema.Types.Mixed },
    },
    durationSec: { type: Number }, // REQ-VID-LIB-022
    width: { type: Number }, // REQ-VID-LIB-023
    height: { type: Number },
    videoCodec: { type: String },
    audioCodec: { type: String, default: null },
    container: { type: String },
    storageKey: { type: String }, // object key in the user's bucket
    sessionExpiresAt: { type: Date }, // E12 / REQ-VID-LIB-043
    uploadedAt: { type: Date },
    availableAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("video", videoSchema);
