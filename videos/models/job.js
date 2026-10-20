const mongoose = require("mongoose");
const { JOB_STATUS } = require("../utils/status");

// Video processing request (UC-VID-001 trim; other video tools reuse it).
// Team decision UC-VID-002 A8 / UC-VID-001 A9: requests are kept in the same
// service as the library, so deleting a video checks whether it is the source
// of a request that is still "queued" or "processing" (UC-VID-002 E13).
const jobSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    sourceVideoId: { type: String, required: true, index: true },
    sourceName: { type: String },
    type: { type: String, enum: ["trim"], required: true },
    params: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, enum: Object.values(JOB_STATUS), required: true, index: true },
    progress: { type: Number, default: 0 }, // 0-100 (REQ-VID-TRIM-017)
    attempts: { type: Number, default: 0 }, // RN7
    estimatedBytes: { type: Number, default: 0 }, // E7 estimate
    error: {
      code: { type: String },
      details: { type: mongoose.Schema.Types.Mixed },
    },
    resultVideoId: { type: String },
    seen: { type: Boolean, default: false }, // in-app notification shown (REQ-VID-TRIM-023/035)
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("job", jobSchema);
